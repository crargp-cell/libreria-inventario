import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { logAudit } from './audit';
import { HttpError } from './auth/guard';
import { STAFF, has } from './auth/roles';
import { toInt, toText, stockStatus } from './validate';
import { detailsText } from './products';
import { label } from './labels';

// Reglas de negocio de las solicitudes al almacén. Ninguna respuesta incluye precios.

export const REQUEST_STATUSES = ['pending', 'approved', 'partially_dispatched', 'dispatched', 'rejected', 'cancelled'] as const;
export const DISPATCH_TYPES = ['venta', 'reposicion'] as const;

const person = { select: { id: true, name: true } } as const;

/** Detalle de una solicitud. El stock disponible solo se envía a quien gestiona o consulta el almacén. */
export async function getRequestDetail(id: string, viewer: { userId: string; role: string }) {
  const staff = has(STAFF, viewer.role);
  const request = await prisma.stockRequest.findUnique({
    where: { id },
    include: {
      requester: person,
      reviewer: person,
      cancelledBy: person,
      items: {
        orderBy: { productName: 'asc' },
        include: { inventoryItem: { select: { quantity: true, unitsPerPack: true, packName: true } } },
      },
      dispatches: {
        orderBy: { createdAt: 'asc' },
        include: {
          dispatchedBy: person,
          receivedBy: person,
          items: { select: { id: true, requestItemId: true, quantity: true } },
        },
      },
    },
  });
  // Un vendedor solo ve las suyas: para las ajenas se responde igual que si no existieran
  if (!request || (!staff && request.requesterId !== viewer.userId)) {
    throw new HttpError(404, 'Solicitud no encontrada');
  }
  return {
    ...request,
    items: request.items.map(({ inventoryItem, ...item }) => ({
      ...item,
      unitsPerPack: inventoryItem.unitsPerPack,
      packName: inventoryItem.packName,
      ...(staff ? { stock: inventoryItem.quantity } : {}),
    })),
  };
}

/** Bloquea la fila de la solicitud: serializa aprobaciones, cancelaciones y despachos simultáneos. */
async function lockRequest(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "StockRequest" WHERE id = ${id} FOR UPDATE`;
  const request = await tx.stockRequest.findUnique({ where: { id }, include: { items: true } });
  if (!request) throw new HttpError(404, 'Solicitud no encontrada');
  return request;
}

const optionalNote = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  const note = toText(value, 500);
  if (!note) throw new HttpError(400, 'Observación no válida (máximo 500 caracteres)');
  return note;
};

export async function createRequest(userId: string, body: any, ip: string) {
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
    throw new HttpError(400, 'La solicitud debe tener entre 1 y 100 productos');
  }
  const wanted = new Map<string, number>();
  for (const line of body.items) {
    const quantity = toInt(line?.quantity, 1, 100_000);
    if (typeof line?.inventoryItemId !== 'string' || quantity === null) {
      throw new HttpError(400, 'Cada producto necesita una cantidad entera de al menos 1');
    }
    wanted.set(line.inventoryItemId, (wanted.get(line.inventoryItemId) || 0) + quantity);
  }
  const note = optionalNote(body.note);
  const products = await prisma.inventoryItem.findMany({
    where: { id: { in: [...wanted.keys()] } },
    select: { id: true, name: true, code: true, supplier: true, color: true, size: true, model: true, presentation: true },
  });
  if (products.length !== wanted.size) throw new HttpError(404, 'Algunos productos no existen');

  // Crear la solicitud NO modifica existencias
  const created = await prisma.stockRequest.create({
    data: {
      requesterId: userId,
      note,
      items: {
        create: products.map((p) => ({
          inventoryItemId: p.id,
          productName: p.name,
          productCode: p.code,
          brand: p.supplier,
          details: detailsText(p) || null,
          requestedQty: wanted.get(p.id)!,
        })),
      },
    },
  });
  await logAudit({ action: 'CREATE', entityType: 'STOCK_REQUEST', entityId: created.id, userId, changes: { number: created.number, items: wanted.size }, ipAddress: ip });
  return created;
}

export async function approveRequest(id: string, userId: string, body: any, ip: string) {
  const note = optionalNote(body.note);
  const overrides = new Map<string, number>();
  if (body.items !== undefined) {
    if (!Array.isArray(body.items) || body.items.length > 100) throw new HttpError(400, 'Lista de productos no válida');
    for (const line of body.items) {
      const qty = toInt(line?.approvedQty, 0, 100_000);
      if (typeof line?.itemId !== 'string' || qty === null) throw new HttpError(400, 'La cantidad aprobada debe ser un entero de 0 o más');
      overrides.set(line.itemId, qty);
    }
  }
  await prisma.$transaction(async (tx) => {
    const request = await lockRequest(tx, id);
    if (request.status !== 'pending') throw new HttpError(409, `La solicitud ya está: ${label(request.status)}`);
    if ([...overrides.keys()].some((k) => !request.items.some((i) => i.id === k))) {
      throw new HttpError(400, 'Ese producto no pertenece a la solicitud');
    }
    let totalApproved = 0;
    for (const item of request.items) {
      const approved = overrides.get(item.id) ?? item.requestedQty;
      if (approved > item.requestedQty) throw new HttpError(400, 'No se puede aprobar más de lo solicitado');
      totalApproved += approved;
      await tx.stockRequestItem.update({ where: { id: item.id }, data: { approvedQty: approved } });
    }
    if (totalApproved === 0) throw new HttpError(400, 'Aprueba al menos una unidad o rechaza la solicitud');
    // Aprobar NO descuenta existencias
    await tx.stockRequest.update({
      where: { id },
      data: { status: 'approved', reviewerId: userId, reviewNote: note, reviewedAt: new Date() },
    });
  });
  await logAudit({ action: 'APPROVE', entityType: 'STOCK_REQUEST', entityId: id, userId, ipAddress: ip });
}

export async function rejectRequest(id: string, userId: string, body: any, ip: string) {
  const note = optionalNote(body.note);
  await prisma.$transaction(async (tx) => {
    const request = await lockRequest(tx, id);
    if (request.status !== 'pending') throw new HttpError(409, `La solicitud ya está: ${label(request.status)}`);
    await tx.stockRequest.update({
      where: { id },
      data: { status: 'rejected', reviewerId: userId, reviewNote: note, reviewedAt: new Date() },
    });
  });
  await logAudit({ action: 'REJECT', entityType: 'STOCK_REQUEST', entityId: id, userId, ipAddress: ip });
}

/** Cancela una solicitud sin despachos: el vendedor las suyas; el almacén, cualquiera. */
export async function cancelRequest(id: string, viewer: { userId: string; role: string }, ip: string) {
  await prisma.$transaction(async (tx) => {
    const request = await lockRequest(tx, id);
    if (viewer.role === 'vendedor' && request.requesterId !== viewer.userId) {
      throw new HttpError(404, 'Solicitud no encontrada');
    }
    const dispatched = request.items.some((i) => i.dispatchedQty > 0);
    if (!['pending', 'approved'].includes(request.status) || dispatched) {
      throw new HttpError(409, `Una solicitud en estado "${label(request.status)}" no se puede cancelar`);
    }
    await tx.stockRequest.update({
      where: { id },
      data: { status: 'cancelled', cancelledById: viewer.userId, cancelledAt: new Date() },
    });
  });
  await logAudit({ action: 'CANCEL', entityType: 'STOCK_REQUEST', entityId: id, userId: viewer.userId, ipAddress: ip });
}

/**
 * Registra un despacho (total o parcial). Es el ÚNICO punto del flujo que descuenta existencias.
 * La clave de idempotencia evita registrar dos veces la misma operación (doble clic, reintentos).
 */
export async function dispatchRequest(id: string, userId: string, body: any, ip: string) {
  const type = body.type;
  if (!DISPATCH_TYPES.includes(type)) throw new HttpError(400, 'Elige el tipo de salida: venta o reposición');
  const key = body.idempotencyKey;
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(key)) throw new HttpError(400, 'Falta la clave de la operación');
  const note = optionalNote(body.note);
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
    throw new HttpError(400, 'Indica los productos a despachar');
  }
  const lines = new Map<string, number>();
  for (const line of body.items) {
    const qty = toInt(line?.quantity, 0, 100_000);
    if (typeof line?.itemId !== 'string' || qty === null) throw new HttpError(400, 'La cantidad a despachar debe ser un entero de 0 o más');
    if (lines.has(line.itemId)) throw new HttpError(400, 'Producto repetido');
    if (qty > 0) lines.set(line.itemId, qty);
  }
  if (lines.size === 0) throw new HttpError(400, 'Despacha al menos una unidad');

  const result = await prisma.$transaction(
    async (tx) => {
      const request = await lockRequest(tx, id);

      const previous = await tx.dispatch.findUnique({ where: { idempotencyKey: key } });
      if (previous) {
        if (previous.requestId !== id) throw new HttpError(409, 'Esa operación ya fue registrada en otra solicitud');
        return { dispatch: previous, duplicate: true };
      }
      if (!['approved', 'partially_dispatched'].includes(request.status)) {
        throw new HttpError(409, `No se puede despachar una solicitud en estado "${label(request.status)}"`);
      }

      const selected = [...lines.entries()].map(([itemId, quantity]) => {
        const item = request.items.find((i) => i.id === itemId);
        if (!item) throw new HttpError(400, 'Ese producto no pertenece a la solicitud');
        const remaining = (item.approvedQty ?? 0) - item.dispatchedQty;
        if (quantity > remaining) {
          throw new HttpError(409, `${item.productName}: solo quedan ${remaining} unidades autorizadas por despachar`);
        }
        return { item, quantity };
      });
      // Orden estable al descontar: evita interbloqueos entre despachos simultáneos
      selected.sort((a, b) => a.item.inventoryItemId.localeCompare(b.item.inventoryItemId));

      const detail: { requestItemId: string; inventoryItemId: string; quantity: number; stockBefore: number; stockAfter: number }[] = [];
      for (const { item, quantity } of selected) {
        // Descuento atómico: solo si alcanza el stock
        const updated = await tx.inventoryItem.updateMany({
          where: { id: item.inventoryItemId, quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        const product = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: item.inventoryItemId },
          select: { quantity: true, minStockLevel: true },
        });
        if (updated.count !== 1) {
          throw new HttpError(409, `Stock insuficiente de ${item.productName}: hay ${product.quantity} disponibles`);
        }
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { status: stockStatus(product.quantity, product.minStockLevel) },
        });
        await tx.stockRequestItem.update({ where: { id: item.id }, data: { dispatchedQty: { increment: quantity } } });
        detail.push({
          requestItemId: item.id,
          inventoryItemId: item.inventoryItemId,
          quantity,
          stockBefore: product.quantity + quantity,
          stockAfter: product.quantity,
        });
      }

      const complete = request.items.every(
        (i) => i.dispatchedQty + (lines.get(i.id) ?? 0) >= (i.approvedQty ?? 0)
      );
      await tx.stockRequest.update({ where: { id }, data: { status: complete ? 'dispatched' : 'partially_dispatched' } });

      const dispatch = await tx.dispatch.create({
        data: {
          requestId: id,
          type,
          dispatchedById: userId,
          receivedById: request.requesterId,
          note,
          idempotencyKey: key,
          items: { create: detail },
        },
      });
      return { dispatch, duplicate: false };
    },
    { timeout: 20_000 }
  );

  if (!result.duplicate) {
    await logAudit({
      action: 'DISPATCH',
      entityType: 'STOCK_REQUEST',
      entityId: id,
      userId,
      changes: { dispatch: result.dispatch.number, type, lines: lines.size },
      ipAddress: ip,
    });
  }
  return result;
}

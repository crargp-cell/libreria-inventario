import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh } from '@/lib/auth/session';
import { auditActions } from '@/lib/audit';
import { toInt, toMoney, toText, toImage, stockStatus } from '@/lib/validate';
import { readJson } from '@/lib/http';
import { ATTRIBUTE_FIELDS } from '@/lib/products';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyTokenFresh(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Solo admin y superadmin pueden editar inventario
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJson(req, 4_000_000);

    const current = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Solo se actualizan los campos enviados, y cada uno se valida; uno inválido rechaza todo
    const updateData: any = {};
    const fail = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

    if (body.code !== undefined) {
      const v = toText(body.code, 40);
      if (!v) return fail('Invalid code');
      updateData.code = v;
    }
    if (body.name !== undefined) {
      const v = toText(body.name, 200);
      if (!v) return fail('Invalid name');
      updateData.name = v;
    }
    if (body.description !== undefined) {
      const v = body.description ? toText(body.description, 500) : null;
      if (body.description && !v) return fail('Invalid description');
      updateData.description = v;
    }
    if (body.image !== undefined) {
      const v = body.image ? toImage(body.image) : null;
      if (body.image && !v) return fail('Invalid image');
      updateData.image = v;
    }
    for (const field of ATTRIBUTE_FIELDS) {
      if (body[field] === undefined) continue;
      const v = body[field] ? toText(body[field], 80) : null;
      if (body[field] && !v) return fail(`Invalid ${field}`);
      updateData[field] = v;
    }
    if (body.supplier !== undefined) {
      const v = body.supplier ? toText(body.supplier, 120) : null;
      if (body.supplier && !v) return fail('Invalid supplier');
      updateData.supplier = v;
    }
    if (body.categoryId !== undefined) {
      if (typeof body.categoryId !== 'string') return fail('Invalid categoryId');
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      if (cat.status === 'inactive' && body.categoryId !== current.categoryId) return fail('Category is inactive');
      updateData.categoryId = body.categoryId;
    }
    if (body.quantity !== undefined) {
      const v = toInt(body.quantity, 0, 10_000_000);
      if (v === null) return fail('quantity must be an integer >= 0');
      updateData.quantity = v;
    }
    if (body.minStockLevel !== undefined) {
      const v = toInt(body.minStockLevel, 0, 10_000_000);
      if (v === null) return fail('minStockLevel must be an integer >= 0');
      updateData.minStockLevel = v;
    }
    if (body.unitPrice !== undefined) {
      const v = toMoney(body.unitPrice);
      if (v === null) return fail('unitPrice must be a number >= 0 with up to 2 decimals');
      updateData.unitPrice = v;
    }
    if (body.unitsPerPack !== undefined) {
      const size = toInt(body.unitsPerPack, 1, 100_000);
      if (size === null) return fail('unitsPerPack must be an integer between 1 and 100000');
      updateData.unitsPerPack = size;
      updateData.packName = size > 1 ? toText(body.packName || 'Caja', 30) || 'Caja' : null;
    }

    // El estado siempre se recalcula si cambió la cantidad o el mínimo
    if (updateData.quantity !== undefined || updateData.minStockLevel !== undefined) {
      updateData.status = stockStatus(
        updateData.quantity ?? current.quantity,
        updateData.minStockLevel ?? current.minStockLevel
      );
    }

    let item;
    try {
      item = await prisma.inventoryItem.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'Product code already exists' }, { status: 409 });
      }
      throw e;
    }

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.inventoryUpdated(
      payload.userId,
      id,
      { updated: Object.keys(updateData) },
      ipAddress || undefined
    );

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

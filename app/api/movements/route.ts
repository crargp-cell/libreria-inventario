import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser, handleError } from '@/lib/auth/guard';
import { STAFF } from '@/lib/auth/roles';
import { REQUEST_STATUSES } from '@/lib/requests';
import { pageParams } from '@/lib/validate';
import { searchWords } from '@/lib/products';

// Historial de movimientos: una fila por línea de solicitud y por cada despacho de esa línea,
// más las entradas de reabastecimiento aprobadas. No incluye precios.
const MOVEMENTS = Prisma.sql`
  SELECT it.id || ':' || coalesce(di.id, '-') AS id,
         coalesce(d.type, 'solicitud') AS type,
         r.id AS "requestId", r.number AS "requestNumber", d.number AS "dispatchNumber",
         it."inventoryItemId" AS "itemId", it."productName", it."productCode", it.brand, it.details,
         it."requestedQty", it."approvedQty", di.quantity AS "dispatchedQty",
         r.status,
         r."requesterId", req.name AS requester,
         r."reviewerId", rev.name AS reviewer,
         d."dispatchedById", disp.name AS dispatcher,
         r."createdAt" AS "requestedAt", r."reviewedAt" AS "approvedAt", d."createdAt" AS "dispatchedAt",
         r.note AS "requestNote", r."reviewNote", d.note AS "dispatchNote",
         coalesce(d."createdAt", r."reviewedAt", r."createdAt") AS date
  FROM "StockRequestItem" it
  JOIN "StockRequest" r ON r.id = it."requestId"
  JOIN "User" req ON req.id = r."requesterId"
  LEFT JOIN "User" rev ON rev.id = r."reviewerId"
  LEFT JOIN "DispatchItem" di ON di."requestItemId" = it.id
  LEFT JOIN "Dispatch" d ON d.id = di."dispatchId"
  LEFT JOIN "User" disp ON disp.id = d."dispatchedById"
  UNION ALL
  SELECT rr.id, 'entrada', NULL, NULL, NULL,
         i.id, i.name, i.code, i.supplier, concat_ws(' · ', i.color, i.size, i.model, i.presentation),
         rr."quantityRequested", rr."quantityRequested", rr."quantityRequested",
         'completed',
         NULL, NULL,
         rr."approvedById", ap.name,
         rr."approvedById", ap.name,
         rr."createdAt", rr."approvedAt", rr."approvedAt",
         NULL, NULL, NULL,
         coalesce(rr."approvedAt", rr."createdAt")
  FROM "RestockRequest" rr
  JOIN "InventoryItem" i ON i.id = rr."inventoryItemId"
  LEFT JOIN "User" ap ON ap.id = rr."approvedById"
  WHERE rr.status = 'approved'
`;

const TYPES = ['venta', 'reposicion', 'solicitud', 'entrada'];

// Fechas en hora de Bolivia (UTC-4, sin horario de verano)
function dayStart(value: string | null, addDays = 0): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00-04:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + addDays);
  return date;
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, STAFF);
    const { searchParams } = new URL(req.url);
    const { skip, take } = pageParams(searchParams, 25);

    const filters: Prisma.Sql[] = [];
    const from = dayStart(searchParams.get('from'));
    const to = dayStart(searchParams.get('to'), 1);
    // Las columnas son "timestamp" en UTC: el parámetro se convierte a UTC para que la zona de la sesión no desplace el filtro
    if (from) filters.push(Prisma.sql`m.date >= (${from}::timestamptz AT TIME ZONE 'UTC')`);
    if (to) filters.push(Prisma.sql`m.date < (${to}::timestamptz AT TIME ZONE 'UTC')`);
    const type = searchParams.get('type');
    if (type && TYPES.includes(type)) filters.push(Prisma.sql`m.type = ${type}`);
    const status = searchParams.get('status');
    if (status && (REQUEST_STATUSES as readonly string[]).includes(status)) filters.push(Prisma.sql`m.status = ${status}`);
    const requesterId = searchParams.get('requesterId');
    if (requesterId) filters.push(Prisma.sql`m."requesterId" = ${requesterId}`);
    const handlerId = searchParams.get('handlerId');
    if (handlerId) filters.push(Prisma.sql`(m."reviewerId" = ${handlerId} OR m."dispatchedById" = ${handlerId})`);
    for (const word of searchWords(searchParams.get('q'))) {
      const like = `%${word.replace(/[\\%_]/g, '\\$&')}%`;
      filters.push(Prisma.sql`concat_ws(' ', m."productName", m."productCode", m.brand, m.details) ILIKE ${like}`);
    }
    const where = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;

    const [movements, summary, requesters, handlers] = await Promise.all([
      prisma.$queryRaw<unknown[]>`
        SELECT * FROM (${MOVEMENTS}) m ${where}
        ORDER BY m.date DESC, m.id LIMIT ${take} OFFSET ${skip}`,
      prisma.$queryRaw<{ total: number; venta: number; reposicion: number; entrada: number }[]>`
        SELECT COUNT(*)::int AS total,
               coalesce(SUM(m."dispatchedQty") FILTER (WHERE m.type = 'venta'), 0)::int AS venta,
               coalesce(SUM(m."dispatchedQty") FILTER (WHERE m.type = 'reposicion'), 0)::int AS reposicion,
               coalesce(SUM(m."dispatchedQty") FILTER (WHERE m.type = 'entrada'), 0)::int AS entrada
        FROM (${MOVEMENTS}) m ${where}`,
      prisma.user.findMany({
        where: { stockRequests: { some: {} } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { OR: [{ reviewedRequests: { some: {} } }, { dispatchesMade: { some: {} } }] },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const { total = 0, ...units } = summary[0] ?? {};
    return NextResponse.json({ movements, total, units, people: { requesters, handlers }, skip, take });
  } catch (error) {
    return handleError(error, 'Error fetching movements:');
  }
}

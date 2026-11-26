import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, handleError } from '@/lib/auth/guard';
import { MONEY, STAFF, has } from '@/lib/auth/roles';
import { toInt } from '@/lib/validate';

const DAY_MS = 24 * 60 * 60 * 1000;
// Los días se calculan en hora local del negocio, no en UTC
const TZ = 'America/La_Paz';

// Indicadores del almacén: existencias, solicitudes y despachos. No hay datos de ventas ni cobros.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req, STAFF);
    const { searchParams } = new URL(req.url);
    const days = toInt(searchParams.get('days') ?? '30', 1, 365) ?? 30;
    const startDate = new Date(Date.now() - days * DAY_MS);
    // Período anterior de la misma duración, para calcular la variación
    const prevStart = new Date(startDate.getTime() - days * DAY_MS);

    const [totalItems, lowStockItems, outOfStockItems, byStatus, createdRequests, pendingEntries, inv, units, prevUnits, dispatchCount, daily, topProducts, byRequester, byCategory] =
      await Promise.all([
        prisma.inventoryItem.count(),
        prisma.inventoryItem.count({ where: { status: 'low_stock' } }),
        prisma.inventoryItem.count({ where: { status: 'out_of_stock' } }),
        prisma.stockRequest.groupBy({ by: ['status'], _count: true }),
        prisma.stockRequest.count({ where: { createdAt: { gte: startDate } } }),
        prisma.restockRequest.count({ where: { status: 'pending' } }),
        prisma.$queryRaw<{ value: number; units: number; withStock: number }[]>`
          SELECT COALESCE(SUM(quantity * "unitPrice"), 0)::float AS value,
                 COALESCE(SUM(quantity), 0)::int AS units,
                 COUNT(*) FILTER (WHERE quantity > 0)::int AS "withStock"
          FROM "InventoryItem"`,
        prisma.$queryRaw<{ type: string; units: number }[]>`
          SELECT d.type, COALESCE(SUM(di.quantity), 0)::int AS units
          FROM "DispatchItem" di JOIN "Dispatch" d ON d.id = di."dispatchId"
          WHERE d."createdAt" >= (${startDate}::timestamptz AT TIME ZONE 'UTC') GROUP BY d.type`,
        prisma.$queryRaw<{ units: number }[]>`
          SELECT COALESCE(SUM(di.quantity), 0)::int AS units
          FROM "DispatchItem" di JOIN "Dispatch" d ON d.id = di."dispatchId"
          WHERE d."createdAt" >= (${prevStart}::timestamptz AT TIME ZONE 'UTC') AND d."createdAt" < (${startDate}::timestamptz AT TIME ZONE 'UTC')`,
        prisma.dispatch.count({ where: { createdAt: { gte: startDate } } }),
        prisma.$queryRaw<{ date: string; type: string; units: number }[]>`
          SELECT to_char((d."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS date,
                 d.type, SUM(di.quantity)::int AS units
          FROM "DispatchItem" di JOIN "Dispatch" d ON d.id = di."dispatchId"
          WHERE d."createdAt" >= (${startDate}::timestamptz AT TIME ZONE 'UTC') GROUP BY 1, 2`,
        prisma.$queryRaw<{ id: string; code: string; name: string; quantity: number }[]>`
          SELECT i.id, i.code, i.name, SUM(di.quantity)::int AS quantity
          FROM "DispatchItem" di JOIN "Dispatch" d ON d.id = di."dispatchId"
          JOIN "InventoryItem" i ON i.id = di."inventoryItemId"
          WHERE d."createdAt" >= (${startDate}::timestamptz AT TIME ZONE 'UTC')
          GROUP BY i.id, i.code, i.name ORDER BY quantity DESC, i.name LIMIT 5`,
        prisma.$queryRaw<{ name: string; dispatches: number; units: number }[]>`
          SELECT u.name, COUNT(DISTINCT d.id)::int AS dispatches, SUM(di.quantity)::int AS units
          FROM "DispatchItem" di JOIN "Dispatch" d ON d.id = di."dispatchId"
          JOIN "User" u ON u.id = d."receivedById"
          WHERE d."createdAt" >= (${startDate}::timestamptz AT TIME ZONE 'UTC')
          GROUP BY u.id, u.name ORDER BY units DESC LIMIT 5`,
        prisma.$queryRaw<{ name: string; units: number }[]>`
          SELECT c.name, SUM(di.quantity)::int AS units
          FROM "DispatchItem" di JOIN "Dispatch" d ON d.id = di."dispatchId"
          JOIN "InventoryItem" i ON i.id = di."inventoryItemId"
          JOIN "Category" c ON c.id = i."categoryId"
          WHERE d."createdAt" >= (${startDate}::timestamptz AT TIME ZONE 'UTC')
          GROUP BY c.name ORDER BY units DESC LIMIT 6`,
      ]);

    const dailyData: Record<string, { venta: number; reposicion: number }> = {};
    for (const row of daily) {
      dailyData[row.date] ??= { venta: 0, reposicion: 0 };
      if (row.type === 'venta' || row.type === 'reposicion') dailyData[row.date][row.type] = row.units;
    }
    const unitsOf = (type: string) => units.find((u) => u.type === type)?.units ?? 0;
    const snapshot = inv[0] ?? { value: 0, units: 0, withStock: 0 };

    return NextResponse.json({
      period: { days, startDate: startDate.toISOString() },
      inventory: {
        totalItems,
        lowStockItems,
        outOfStockItems,
        productsWithStock: snapshot.withStock,
        units: snapshot.units,
        // Valor monetario solo para quien puede ver precios
        ...(has(MONEY, user.role) ? { value: snapshot.value } : {}),
      },
      requests: {
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
        created: createdRequests,
      },
      dispatches: {
        count: dispatchCount,
        venta: unitsOf('venta'),
        reposicion: unitsOf('reposicion'),
        previousUnits: prevUnits[0]?.units ?? 0,
        daily: dailyData,
        topProducts,
        byRequester,
        byCategory,
      },
      pendingEntries,
    });
  } catch (error) {
    return handleError(error, 'Error fetching stats:');
  }
}

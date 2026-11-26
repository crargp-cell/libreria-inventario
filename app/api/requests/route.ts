import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, handleError } from '@/lib/auth/guard';
import { REQUESTERS, STAFF, has } from '@/lib/auth/roles';
import { createRequest, getRequestDetail, REQUEST_STATUSES } from '@/lib/requests';
import { pageParams, toInt } from '@/lib/validate';
import { clientIp, readJson } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const staff = has(STAFF, user.role);
    const { searchParams } = new URL(req.url);
    const { skip, take } = pageParams(searchParams, 20, 50);

    // Quien no es del almacén solo ve SUS solicitudes, pida lo que pida en la URL
    const where: any = staff ? {} : { requesterId: user.userId };
    const requesterId = searchParams.get('requesterId');
    if (staff && requesterId) where.requesterId = requesterId;
    const status = searchParams.get('status');
    if (status && (REQUEST_STATUSES as readonly string[]).includes(status)) where.status = status;
    const number = toInt((searchParams.get('number') || '').replace(/\D/g, ''), 1, 2_000_000_000);
    if (number) where.number = number;

    const [rows, total, grouped] = await Promise.all([
      prisma.stockRequest.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true } },
          items: { select: { requestedQty: true, approvedQty: true, dispatchedQty: true, productName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.stockRequest.count({ where }),
      prisma.stockRequest.groupBy({ by: ['status'], where: staff ? {} : { requesterId: user.userId }, _count: true }),
    ]);

    const requests = rows.map(({ items, ...r }) => ({
      ...r,
      itemCount: items.length,
      preview: items.slice(0, 3).map((i) => i.productName),
      requestedUnits: items.reduce((s, i) => s + i.requestedQty, 0),
      approvedUnits: items.reduce((s, i) => s + (i.approvedQty ?? 0), 0),
      dispatchedUnits: items.reduce((s, i) => s + i.dispatchedQty, 0),
    }));
    const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
    return NextResponse.json({ requests, total, counts, skip, take });
  } catch (error) {
    return handleError(error, 'Error fetching requests:');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, REQUESTERS);
    const body = await readJson(req);
    const created = await createRequest(user.userId, body, clientIp(req));
    return NextResponse.json(await getRequestDetail(created.id, user), { status: 201 });
  } catch (error) {
    return handleError(error, 'Error creating request:');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, handleError } from '@/lib/auth/guard';
import { ADMINS } from '@/lib/auth/roles';
import { pageParams } from '@/lib/validate';

// El sistema ya no registra ventas (es un sistema de almacén). Las órdenes anteriores se conservan
// como historial de solo lectura para administración.
export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ADMINS);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const { skip, take } = pageParams(searchParams, 20);

    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          lineItems: { include: { inventoryItem: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total, skip, take });
  } catch (error) {
    return handleError(error, 'Error fetching orders:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    return NextResponse.json(
      { error: 'Sales registration was removed. Use warehouse requests (/api/requests).' },
      { status: 410 }
    );
  } catch (error) {
    return handleError(error, 'Error:');
  }
}

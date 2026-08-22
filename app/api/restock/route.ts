import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { auditActions } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '20');

    const where: any = {};
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.restockRequest.findMany({
        where,
        include: {
          inventoryItem: true,
          createdBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.restockRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      total,
      skip,
      take,
    });
  } catch (error) {
    console.error('Error fetching restock requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Solo admin puede crear restock
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { inventoryItemId, quantityRequested } = await req.json();

    if (!inventoryItemId || !quantityRequested || quantityRequested <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid fields' },
        { status: 400 }
      );
    }

    // Verificar que item existe
    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Crear restock request
    const restockRequest = await prisma.restockRequest.create({
      data: {
        inventoryItemId,
        quantityRequested,
        status: 'pending',
        createdById: payload.userId,
      },
      include: {
        inventoryItem: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.restockRequested(
      payload.userId,
      restockRequest.id,
      { itemId: inventoryItemId, quantity: quantityRequested },
      ipAddress || undefined
    );

    return NextResponse.json(restockRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating restock request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

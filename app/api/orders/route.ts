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

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          lineItems: {
            include: {
              inventoryItem: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      total,
      skip,
      take,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
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

    // Cajeros y admins pueden crear órdenes
    if (!['cajero', 'admin', 'supervisor', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item required' },
        { status: 400 }
      );
    }

    // Validar que todos los items existan
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        id: { in: items.map((i: any) => i.inventoryItemId) },
      },
    });

    if (inventoryItems.length !== items.length) {
      return NextResponse.json(
        { error: 'Some inventory items not found' },
        { status: 404 }
      );
    }

    // Calcular total
    let total = 0;
    const lineItemsData = items.map((item: any) => {
      const inventoryItem = inventoryItems.find(
        (ii) => ii.id === item.inventoryItemId
      );
      const lineTotal = (inventoryItem?.unitPrice || 0) * item.quantity;
      total += lineTotal;
      return {
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        unitPrice: inventoryItem?.unitPrice || 0,
      };
    });

    // Generar número de orden
    const orderNumber = `ORD-${Date.now()}`;

    // Crear orden
    const order = await prisma.order.create({
      data: {
        orderNumber,
        total,
        status: 'completed',
        createdById: payload.userId,
        lineItems: {
          createMany: {
            data: lineItemsData,
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        lineItems: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    // Decrementar cantidades del inventario
    for (const item of items) {
      await prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.orderCreated(
      payload.userId,
      order.id,
      { orderNumber, total, itemCount: items.length },
      ipAddress || undefined
    );

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

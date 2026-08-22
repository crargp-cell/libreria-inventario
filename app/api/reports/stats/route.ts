import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

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

    // Obtener período (últimos 30 días por defecto)
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Estadísticas de inventario
    const [totalItems, lowStockItems, outOfStockItems] = await Promise.all([
      prisma.inventoryItem.count(),
      prisma.inventoryItem.count({ where: { status: 'low_stock' } }),
      prisma.inventoryItem.count({ where: { status: 'out_of_stock' } }),
    ]);

    // Estadísticas de órdenes
    const [totalOrders, completedOrders] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: 'completed',
        },
      }),
    ]);

    // Calcular ventas totales
    const totalSalesData = await prisma.order.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: { total: true },
    });
    const totalSales = totalSalesData._sum.total || 0;

    // Órdenes por día
    const ordersByDay = await prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, total: true },
    });

    // Agrupar por día
    const dailyData: Record<string, { orders: number; sales: number }> = {};
    ordersByDay.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { orders: 0, sales: 0 };
      }
      dailyData[dateKey].orders += 1;
      dailyData[dateKey].sales += order.total;
    });

    // Productos más vendidos
    const topProducts = await prisma.orderLineItem.groupBy({
      by: ['inventoryItemId'],
      _sum: { quantity: true },
      _count: true,
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    // Obtener detalles de productos
    const topProductsDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.inventoryItem.findUnique({
          where: { id: item.inventoryItemId || '' },
          select: { id: true, code: true, name: true },
        });
        return {
          ...product,
          quantity: item._sum.quantity || 0,
          orders: item._count,
        };
      })
    );

    // Restock requests pendientes
    const pendingRestocks = await prisma.restockRequest.count({
      where: { status: 'pending' },
    });

    return NextResponse.json({
      period: { days, startDate: startDate.toISOString() },
      inventory: {
        totalItems,
        lowStockItems,
        outOfStockItems,
      },
      sales: {
        totalOrders,
        completedOrders,
        totalSales,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
      daily: dailyData,
      topProducts: topProductsDetails,
      pendingRestocks,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

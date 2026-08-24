import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { auditActions } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Solo admin y superadmin pueden editar inventario
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { code, name, description, categoryId, quantity, minStockLevel, unitPrice, supplier } =
      await req.json();

    const updateData: any = {};
    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (categoryId) updateData.categoryId = categoryId;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (minStockLevel) updateData.minStockLevel = minStockLevel;
    if (unitPrice) updateData.unitPrice = unitPrice;
    if (supplier) updateData.supplier = supplier;

    // Determinar status si cambió la cantidad
    if (quantity !== undefined) {
      const minStock = minStockLevel || (await prisma.inventoryItem.findUnique({ where: { id } }))?.minStockLevel || 10;
      updateData.status = quantity === 0 ? 'out_of_stock' : quantity < minStock ? 'low_stock' : 'in_stock';
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

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
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh } from '@/lib/auth/session';
import { auditActions } from '@/lib/audit';
import { stockStatus } from '@/lib/validate';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Solo admin/superadmin pueden aprobar restock
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Atómico: solo una solicitud "pending" puede aprobarse, y solo una vez
    // (evita duplicar el stock con doble clic, reintentos o peticiones concurrentes)
    let restockRequest;
    try {
      restockRequest = await prisma.$transaction(async (tx) => {
        const claimed = await tx.restockRequest.updateMany({
          where: { id, status: 'pending' },
          data: { status: 'approved', approvedById: payload.userId, approvedAt: new Date() },
        });
        if (claimed.count !== 1) throw new Error('NOT_PENDING');

        const rr = await tx.restockRequest.findUniqueOrThrow({
          where: { id },
          include: { inventoryItem: true },
        });
        const item = await tx.inventoryItem.update({
          where: { id: rr.inventoryItemId },
          data: { quantity: { increment: rr.quantityRequested }, lastRestocked: new Date() },
        });
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { status: stockStatus(item.quantity, item.minStockLevel) },
        });
        return rr;
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'NOT_PENDING') {
        const exists = await prisma.restockRequest.findUnique({ where: { id }, select: { status: true } });
        return NextResponse.json(
          { error: exists ? `Request is already ${exists.status}` : 'Request not found' },
          { status: exists ? 409 : 404 }
        );
      }
      throw e;
    }

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.restockApproved(payload.userId, id, ipAddress || undefined);

    return NextResponse.json({ success: true, restockRequest });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error approving restock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

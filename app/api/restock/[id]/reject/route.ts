import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh } from '@/lib/auth/session';
import { auditActions } from '@/lib/audit';

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

    // Solo admin/superadmin pueden rechazar restock
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Solo se puede rechazar una solicitud pendiente (no una ya aprobada)
    const claimed = await prisma.restockRequest.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'rejected', approvedById: payload.userId, approvedAt: new Date() },
    });
    if (claimed.count !== 1) {
      const exists = await prisma.restockRequest.findUnique({ where: { id }, select: { status: true } });
      return NextResponse.json(
        { error: exists ? `Request is already ${exists.status}` : 'Request not found' },
        { status: exists ? 409 : 404 }
      );
    }
    const restockRequest = await prisma.restockRequest.findUnique({ where: { id } });

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.restockRejected(payload.userId, id, ipAddress || undefined);

    return NextResponse.json({ success: true, restockRequest });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error rejecting restock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

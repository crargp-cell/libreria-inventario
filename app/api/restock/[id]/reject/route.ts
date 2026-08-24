import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { auditActions } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Solo admin/superadmin pueden rechazar restock
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restockRequest = await prisma.restockRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedById: payload.userId,
        approvedAt: new Date(),
      },
    });

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.restockRejected(payload.userId, id, ipAddress || undefined);

    return NextResponse.json({ success: true, restockRequest });
  } catch (error) {
    console.error('Error rejecting restock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

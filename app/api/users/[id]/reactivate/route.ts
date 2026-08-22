import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { auditActions } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Solo SUPERADMIN puede reactivar usuarios
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmin can reactivate users' }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { status: 'active' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.userUpdated(
      payload.userId,
      params.id,
      { action: 'reactivated' },
      ipAddress || undefined
    );

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error reactivating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh, invalidateUserSession } from '@/lib/auth/session';
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

    // Solo SUPERADMIN puede reactivar usuarios
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmin can reactivate users' }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'active' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    invalidateUserSession(id);

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.userUpdated(
      payload.userId,
      id,
      { action: 'reactivated' },
      ipAddress || undefined
    );

    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error reactivating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

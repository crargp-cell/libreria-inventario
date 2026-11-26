import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh } from '@/lib/auth/session';
import { pageParams } from '@/lib/validate';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyTokenFresh(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // La auditoría es solo para admin y superadmin; cajeros y supervisores no tienen acceso
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const { skip, take } = pageParams(searchParams, 50);

    const where: any = {};
    if (userId) where.userId = userId;

    // Un admin no puede espiar a un nivel superior: se ocultan las acciones de los superadmin
    // y los registros que tratan sobre sus cuentas. Se aplica siempre, aunque pase ?userId=
    if (payload.role === 'admin') {
      const superIds = (await prisma.user.findMany({ where: { role: 'superadmin' }, select: { id: true } })).map((u) => u.id);
      where.AND = [
        { userId: { notIn: superIds } },
        { NOT: { entityType: 'USER', entityId: { in: superIds } } },
      ];
    }

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      skip,
      take,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh, invalidateUserSession } from '@/lib/auth/session';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { auditActions } from '@/lib/audit';
import { toText, toEmail } from '@/lib/validate';
import { readJson } from '@/lib/http';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Solo admin/superadmin pueden ver otros usuarios
    if (!['admin', 'superadmin'].includes(payload.role) && payload.userId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Solo admin/superadmin pueden modificar usuarios
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJson(req);

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Un admin no puede tocar cuentas admin/superadmin (salvo la suya, sin cambiar rol): evita tomar el control de una cuenta
    const isSelf = payload.userId === id;
    if (payload.role === 'admin' && ['admin', 'superadmin'].includes(target.role) && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.name !== undefined) {
      const v = toText(body.name, 100);
      if (!v) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      updateData.name = v;
    }
    if (body.email !== undefined) {
      const v = toEmail(body.email);
      if (!v) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      updateData.email = v;
    }
    if (body.password) {
      const err = validatePasswordPolicy(body.password);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      updateData.passwordHash = await hashPassword(body.password);
    }
    if (body.role !== undefined) {
      if (!['vendedor', 'encargado', 'supervisor', 'admin', 'superadmin'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      if (body.role !== target.role) {
        // Solo un superadmin asigna roles admin/superadmin, y nadie cambia su propio rol
        if (isSelf) {
          return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
        }
        if (['admin', 'superadmin'].includes(body.role) && payload.role !== 'superadmin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        updateData.role = body.role;
      }
    }

    let user;
    try {
      user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      throw e;
    }


    invalidateUserSession(id);

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.userUpdated(
      payload.userId,
      id,
      { updated: Object.keys(updateData) },
      ipAddress || undefined
    );

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Solo admin/superadmin pueden eliminar usuarios
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // No permitir auto-eliminación
    if (payload.userId === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Admin no puede eliminar superadmin
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (payload.role === 'admin' && targetUser.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot delete superadmin' },
        { status: 403 }
      );
    }

    // Eliminación lógica (soft delete)
    await prisma.user.update({
      where: { id },
      data: { status: 'deleted' },
    });

    invalidateUserSession(id);

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.userDeleted(payload.userId, id, ipAddress || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

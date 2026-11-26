import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh } from '@/lib/auth/session';
import { toText } from '@/lib/validate';
import { readJson } from '@/lib/http';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Solo admin/superadmin pueden editar categorías
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJson(req);
    const updateData: any = {};
    if (body.name !== undefined) {
      const v = toText(body.name, 80);
      if (!v) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      updateData.name = v;
    }
    if (body.description !== undefined) {
      const v = body.description ? toText(body.description, 300) : null;
      if (body.description && !v) return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
      updateData.description = v;
    }
    if (body.status !== undefined) {
      if (!['active', 'inactive'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    let category;
    try {
      category = await prisma.category.update({
        where: { id },
        data: updateData,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
      if (e?.code === 'P2025') return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      throw e;
    }

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

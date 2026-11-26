import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, handleError, HttpError } from '@/lib/auth/guard';

// Datos actuales del usuario en sesión (el rol del token puede estar desactualizado).
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new HttpError(401, 'Invalid token');
    return NextResponse.json(user);
  } catch (error) {
    return handleError(error, 'Error fetching session:');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, DUMMY_HASH } from '@/lib/auth/password';
import { isRateLimited, resetRateLimit } from '@/lib/rate-limit';
import { clientIp, readJson } from '@/lib/http';
import { generateToken } from '@/lib/auth/jwt';
import { auditActions } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const password = body?.password;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || typeof password !== 'string' || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Fuerza bruta: se limita POR CUENTA (no depende de datos que el atacante controle) y por IP fiable
    const ip = clientIp(req);
    const emailKey = `login:email:${email}`;
    const ipKey = `login:ip:${ip}`;
    // Sin IP fiable no se limita por IP: todos los usuarios compartirían el mismo contador
    if (isRateLimited(emailKey, 10) || (ip !== 'unknown' && isRateLimited(ipKey, 40))) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Siempre se compara el hash (aunque el usuario no exista) para no revelar emails por tiempo
    const isValidPassword = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

    // Misma respuesta para usuario inexistente, contraseña errónea o cuenta inactiva
    if (!user || !isValidPassword || user.status !== 'active') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    resetRateLimit(emailKey);

    // Generar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.userLogin(user.id, ipAddress || undefined);

    // Crear respuesta
    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Guardar token en httpOnly cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
    });

    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

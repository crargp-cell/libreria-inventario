import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenFresh } from './session';

/** Error de negocio con código HTTP; handleError lo convierte en respuesta. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Exige sesión válida (contrastada con la BD) y, si se indica, uno de los roles permitidos. */
export async function requireUser(req: NextRequest, allowed?: readonly string[]) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new HttpError(401, 'Unauthorized');
  const user = await verifyTokenFresh(token);
  if (!user) throw new HttpError(401, 'Invalid token');
  if (allowed && !allowed.includes(user.role)) throw new HttpError(403, 'Forbidden');
  return user;
}

export function handleError(error: unknown, label: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  console.error(label, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

import { prisma } from '@/lib/db';
import { verifyToken, JWTPayload } from './jwt';

// El JWT por sí solo no basta: un usuario eliminado, desactivado o con otro rol seguiría usando su
// token hasta 24 h. Por eso cada petición se contrasta con la BD (rol y estado actuales), con una
// caché de 5 s para no consultar en cada llamada.
const TTL_MS = 5_000;
const cache = new Map<string, { role: string; status: string; exp: number }>();

export async function verifyTokenFresh(token: string): Promise<JWTPayload | null> {
  const payload = verifyToken(token);
  if (!payload || typeof payload.userId !== 'string') return null;

  let entry = cache.get(payload.userId);
  if (!entry || entry.exp < Date.now()) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, status: true },
    });
    if (!user) {
      cache.delete(payload.userId);
      return null;
    }
    if (cache.size > 1000) cache.clear();
    entry = { role: user.role, status: user.status, exp: Date.now() + TTL_MS };
    cache.set(payload.userId, entry);
  }

  if (entry.status !== 'active') return null;
  // El rol manda el de la BD, no el que quedó escrito en el token
  return { ...payload, role: entry.role };
}

/** Hace efectivo al instante un cambio de rol/estado hecho en esta misma instancia. */
export function invalidateUserSession(userId: string) {
  cache.delete(userId);
}

import type { NextRequest } from 'next/server';

/**
 * Lee el cuerpo JSON con un tope de tamaño. Los route handlers de Next no limitan el cuerpo,
 * así que sin esto cualquiera podría mandar cientos de MB a cualquier endpoint.
 * Si el cuerpo es inválido o demasiado grande lanza SyntaxError (las rutas lo responden como 400).
 */
export async function readJson(req: NextRequest, maxBytes = 100_000): Promise<any> {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new SyntaxError('Body too large');
  const text = await req.text();
  if (text.length > maxBytes) throw new SyntaxError('Body too large');
  const data = JSON.parse(text);
  if (data === null || typeof data !== 'object') throw new SyntaxError('Body must be an object');
  return data;
}

const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

/**
 * IP del cliente. X-Forwarded-For lo controla el atacante (se puede falsear), así que solo se confía
 * en la cabecera del proxy de Cloudflare; si no existe se usa la última entrada de X-Forwarded-For
 * (la que añade el proxy más cercano) y, en último caso, 'unknown'.
 */
export function clientIp(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip');
  const xff = req.headers.get('x-forwarded-for');
  const last = xff ? xff.split(',').pop()?.trim() : undefined;
  const candidate = cf || req.headers.get('x-real-ip') || last || '';
  return IP_RE.test(candidate) ? candidate : 'unknown';
}

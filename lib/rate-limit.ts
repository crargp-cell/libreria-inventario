// Limitador en memoria (por instancia). Suficiente contra fuerza bruta básica;
// en despliegues con varias instancias conviene moverlo a Redis o similar.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, max = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}

'use client';

/** Llamada a la API con el token; lanza Error con el mensaje del servidor si falla. */
export async function api<T = any>(token: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'No se pudo completar la operación');
  return data as T;
}

/** Clave única por operación (evita registrar dos veces el mismo despacho). */
export function operationKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const requestCode = (n: number) => `SOL-${String(n).padStart(5, '0')}`;

export const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

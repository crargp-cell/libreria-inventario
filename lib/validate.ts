// Validaciones compartidas por las rutas de la API. Todas devuelven null cuando el valor no es válido.

/** Entero dentro de [min, max]. Acepta number o string numérico ("12"), rechaza decimales, NaN y notación científica. */
export function toInt(value: unknown, min = 0, max = 1_000_000): number | null {
  if (typeof value === 'string' && !/^-?\d+$/.test(value.trim())) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

/** Monto >= 0 con hasta 2 decimales y tope razonable. */
export function toMoney(value: unknown, max = 10_000_000): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n * 100) / 100;
}

/** Texto limpio (sin espacios sobrantes) con longitud entre min y max, o null. */
export function toText(value: unknown, max: number, min = 1): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim();
  return t.length >= min && t.length <= max ? t : null;
}

export function toEmail(value: unknown): string | null {
  const t = toText(value, 254);
  if (!t) return null;
  const e = t.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/** Estado de stock derivado de la cantidad (en piezas) y del mínimo. */
export function stockStatus(quantity: number, minStockLevel: number): 'out_of_stock' | 'low_stock' | 'in_stock' {
  if (quantity <= 0) return 'out_of_stock';
  return quantity < minStockLevel ? 'low_stock' : 'in_stock';
}

/** Tope de paginación para listados. */
export function pageParams(searchParams: URLSearchParams, defaultTake = 20, maxTake = 100) {
  const skip = toInt(searchParams.get('skip') ?? '0', 0, 10_000_000) ?? 0;
  const take = toInt(searchParams.get('take') ?? String(defaultTake), 1, maxTake) ?? defaultTake;
  return { skip, take };
}

/** Tamaño máximo de una imagen en data URL (~2 MB de imagen = ~2.8 MB en base64). */
export const MAX_IMAGE_CHARS = 3_000_000;
export function toImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_CHARS) return null;
  // Solo data URLs de imagen o URLs https; nada de javascript:, data:text/html, etc.
  return /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https:\/\/[^\s]+$/.test(value)
    ? value
    : null;
}

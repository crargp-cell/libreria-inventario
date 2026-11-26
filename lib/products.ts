// Atributos de producto que distinguen variantes (la marca no cuenta para agrupar).
export const ATTRIBUTE_FIELDS = ['genericName', 'color', 'size', 'model', 'presentation'] as const;

export interface ProductAttributes {
  color?: string | null;
  size?: string | null;
  model?: string | null;
  presentation?: string | null;
}

/** "Azul · Mediano · Modelo X" */
export function detailsText(p: ProductAttributes): string {
  return [p.color, p.size, p.model, p.presentation].map((v) => v?.trim()).filter(Boolean).join(' · ');
}

/** Palabras de búsqueda acotadas. */
export function searchWords(q: string | null | undefined): string[] {
  return (q || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.slice(0, 50));
}

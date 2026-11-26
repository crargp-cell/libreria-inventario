// Lógica de empaques: el stock se guarda siempre en piezas (unidad mínima de venta).
// Una caja/paquete es solo una forma de agrupar: cajas = piezas / unitsPerPack.

const PLURALS: Record<string, string> = {
  Caja: 'cajas',
  Cajita: 'cajitas',
  Paquete: 'paquetes',
  Docena: 'docenas',
  Bolsa: 'bolsas',
  Set: 'sets',
  Estuche: 'estuches',
  Block: 'blocks',
  Tubo: 'tubos',
  Envase: 'envases',
};

export function packPlural(name?: string | null): string {
  if (!name) return 'cajas';
  return PLURALS[name] ?? `${name.toLowerCase()}s`;
}

export function packSingular(name?: string | null): string {
  return (name || 'Caja').toLowerCase();
}

export interface PackInfo {
  quantity: number;
  unitsPerPack?: number | null;
  packName?: string | null;
}

/** Separa el stock total en cajas completas y piezas sueltas. */
export function splitStock({ quantity, unitsPerPack }: PackInfo) {
  const size = unitsPerPack && unitsPerPack > 1 ? unitsPerPack : 1;
  if (size === 1) return { packs: 0, loose: quantity, size };
  return { packs: Math.floor(quantity / size), loose: quantity % size, size };
}

/** Texto unificado: "3 cajas + 5 piezas" (o "41 piezas" si no maneja empaque). */
export function formatStock(info: PackInfo): string {
  const { packs, loose, size } = splitStock(info);
  const pieces = (n: number) => `${n.toLocaleString('es-BO')} ${n === 1 ? 'pieza' : 'piezas'}`;
  if (size === 1) return pieces(info.quantity);
  const packText = `${packs.toLocaleString('es-BO')} ${packs === 1 ? packSingular(info.packName) : packPlural(info.packName)}`;
  if (packs === 0) return pieces(loose);
  return loose === 0 ? packText : `${packText} + ${pieces(loose)}`;
}

/** Convierte "n cajas + m piezas sueltas" al total en piezas. */
export function toPieces(packs: number, loose: number, unitsPerPack: number): number {
  const size = unitsPerPack > 1 ? unitsPerPack : 1;
  return Math.max(0, Math.floor(packs)) * size + Math.max(0, Math.floor(loose));
}

// ---------- Inferencia desde el Excel (solo cuando el archivo indica la cantidad) ----------

const norm = (v: unknown) => String(v ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

export function inferPack(row: { PAQUETE?: unknown; PRESENTACION?: unknown }): {
  packName: string | null;
  unitsPerPack: number | null;
} {
  const paquete = norm(row.PAQUETE);
  const pres = norm(row.PRESENTACION);

  let name: string | null = null;
  if (/^(PIEZA|PZA|PZAS|UNIDAD|HOJA|)$/.test(paquete)) name = null;
  else if (/^CAJITA/.test(paquete)) name = 'Cajita';
  else if (/^CAJ/.test(paquete)) name = 'Caja';
  else if (/^DOCENA/.test(paquete)) name = 'Docena';
  else if (/^PAQUETE|^PQTE/.test(paquete)) name = 'Paquete';
  else if (/^BOLSA/.test(paquete)) name = 'Bolsa';
  else if (/^ESTUCHE/.test(paquete)) name = 'Estuche';
  else if (/^BLOCK/.test(paquete)) name = 'Block';
  else if (/^SET/.test(paquete)) name = 'Set';
  else if (/^TUBO/.test(paquete)) name = 'Tubo';
  else if (/^ENVASE/.test(paquete)) name = 'Envase';

  let n: number | null = null;
  let m: RegExpMatchArray | null;
  if (/MEDIA DOCENA/.test(paquete)) n = 6;
  else if (/DOCENA/.test(paquete)) n = 12;
  else if ((m = paquete.match(/(\d+)\s*(?:PIEZAS|PZAS?|PZS|HOJAS|HJS|UNID)/))) n = parseInt(m[1], 10);
  else if ((m = paquete.match(/^[A-Z ]+\s(\d+)\b/))) n = parseInt(m[1], 10);
  if (n === null) {
    if (/MEDIA DOCENA/.test(pres)) n = 6;
    else if (/DOCENA/.test(pres)) n = 12;
    else if ((m = pres.match(/\b(?:CJA|CAJA|PQTE|PAQ|BOLSA|BLS)\.?\s*(\d+)/))) n = parseInt(m[1], 10);
    else if ((m = pres.match(/\((\d+)\s*(?:PZS|PZAS?|PIEZAS)\.?\)/))) n = parseInt(m[1], 10);
  }
  if (n !== null && (n < 2 || n > 10000)) n = null;

  if (n !== null && !name) {
    if (/CJA|CAJA/.test(pres)) name = 'Caja';
    else if (/DOCENA/.test(pres)) name = 'Docena';
    else name = 'Paquete';
  }
  // Sin cantidad explícita no se adivina: queda como pieza suelta hasta que se configure a mano
  return n === null ? { packName: null, unitsPerPack: null } : { packName: name, unitsPerPack: n };
}

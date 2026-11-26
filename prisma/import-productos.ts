// Importa/actualiza el catálogo desde PRODUCTOS.xlsx sin borrar nada existente:
// los códigos nuevos se crean y los que ya existen se actualizan (nombre, precio, marca, detalle).
// El stock NO se toca en productos existentes; los nuevos arrancan en 0 (el Excel no trae stock).
// Uso: npm run db:import-productos [-- ruta/al/archivo.xlsx]
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { inferPack } from '../lib/packs';

const prisma = new PrismaClient();
const CATEGORY = 'General';
const CHUNK = 500;

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

async function main() {
  const file = process.argv[2] || path.join(__dirname, '..', 'PRODUCTOS.xlsx');
  if (!fs.existsSync(file)) throw new Error(`Archivo no encontrado: ${file}`);

  const ws = XLSX.readFile(file).Sheets[XLSX.readFile(file).SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
  console.log(`${rows.length} filas leídas`);

  const category =
    (await prisma.category.findUnique({ where: { name: CATEGORY } })) ??
    (await prisma.category.create({
      data: { name: CATEGORY, description: 'Catálogo importado desde PRODUCTOS.xlsx' },
    }));

  const products = new Map<string, {
    code: string; name: string; description: string | null; supplier: string | null; unitPrice: number;
    packName: string | null; unitsPerPack: number | null;
  }>();
  let skipped = 0;
  for (const r of rows) {
    const code = clean(r.IDPRODUCTO);
    const name = clean(r.DESCRIPCION);
    if (!code || !name) { skipped++; continue; }
    const price = Math.round((parseFloat(String(r.PRECIOLISTA)) || 0) * 100) / 100;
    const details = [
      clean(r.PRESENTACION) && `Presentación: ${clean(r.PRESENTACION)}`,
      clean(r.UNIDAD) && `Unidad: ${clean(r.UNIDAD)}`,
      clean(r.PAQUETE) && `Paquete: ${clean(r.PAQUETE)}`,
      clean(r['COD ALTERNATIVO']) && clean(r['COD ALTERNATIVO']) !== code && `Cód. alterno: ${clean(r['COD ALTERNATIVO'])}`,
    ].filter(Boolean).join(' · ');
    products.set(code, {
      code,
      name,
      description: details || null,
      supplier: clean(r.MARCAFABRICANTE) || null,
      unitPrice: price < 0 ? 0 : price,
      ...inferPack(r),
    });
  }

  const existingRows = await prisma.inventoryItem.findMany({ select: { code: true, unitsPerPack: true } });
  const existing = new Set(existingRows.map((i) => i.code));
  // Empaques ya configurados a mano: no se pisan
  const manualPack = new Set(existingRows.filter((i) => i.unitsPerPack > 1).map((i) => i.code));
  const all = [...products.values()];
  const toCreate = all.filter((p) => !existing.has(p.code));
  const toUpdate = all.filter((p) => existing.has(p.code));

  for (let i = 0; i < toCreate.length; i += CHUNK) {
    await prisma.inventoryItem.createMany({
      data: toCreate.slice(i, i + CHUNK).map((p) => ({
        ...p,
        unitsPerPack: p.unitsPerPack ?? 1,
        categoryId: category.id,
        quantity: 0,
        status: 'out_of_stock',
      })),
      skipDuplicates: true,
    });
    process.stdout.write(`\rCreados: ${Math.min(i + CHUNK, toCreate.length)}/${toCreate.length}`);
  }
  console.log();

  for (let i = 0; i < toUpdate.length; i += 100) {
    await prisma.$transaction(
      toUpdate.slice(i, i + 100).map((p) =>
        prisma.inventoryItem.update({
          where: { code: p.code },
          data: {
            name: p.name,
            description: p.description,
            supplier: p.supplier,
            unitPrice: p.unitPrice,
            ...(p.unitsPerPack && !manualPack.has(p.code)
              ? { unitsPerPack: p.unitsPerPack, packName: p.packName }
              : {}),
          },
        })
      )
    );
  }

  const total = await prisma.inventoryItem.count();
  console.log(`Creados: ${toCreate.length} · Actualizados: ${toUpdate.length} · Omitidos: ${skipped}`);
  console.log(`Total de productos en la BD: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Reemplaza el catálogo por "INVENTARIO LIDER (1).xlsx".
//
//   npm run db:import-lider              -> ensayo: muestra el resultado y NO modifica nada
//   npm run db:import-lider -- --apply   -> aplica los cambios (en una sola transacción)
//
// Reglas:
//  * SOLO se usa la hoja INVENTARIO. Las demás hojas del archivo se ignoran.
//  * Stock que no es un entero >= 0 ("C", "contar", "OJO", "15+23", negativos, vacío) entra como 0 y queda
//    listado en el reporte para contarlo. No se adivina.
//  * STOCK se carga tal cual, en la unidad que indica la columna "unidad de medida" (queda en Presentación).
//  * El Excel no trae precios: quedan en 0, salvo que el nombre coincida con un producto anterior.
//  * Del catálogo anterior se eliminan los productos sin historial; los que tienen órdenes, entradas,
//    solicitudes o despachos se conservan con stock 0.
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

const prisma = new PrismaClient();
const FILE = process.argv.find((a) => a.endsWith('.xlsx')) || path.join(__dirname, '..', 'INVENTARIO LIDER (1).xlsx');
const APPLY = process.argv.includes('--apply');
const REPORT = path.join(__dirname, '..', 'docs', 'importacion-inventario-lider.csv');

const text = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const norm = (v: unknown) => text(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

interface Row {
  sheet: string;
  line: number;
  name: string;
  brand: string;
  code: string;
  barcode: string;
  unit: string;
  rawStock: unknown;
}

/** Entero >= 0 o null si hay que contarlo. "SIN STOCK" es 0 declarado. */
function parseStock(v: unknown): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 ? v : null;
  const s = norm(v);
  if (s === 'SIN STOCK') return 0;
  return /^\d{1,7}$/.test(s) ? Number(s) : null;
}

function readSheet(wb: XLSX.WorkBook, sheet: string): Row[] {
  if (!wb.Sheets[sheet]) throw new Error(`Falta la hoja ${sheet}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, defval: '' });
  const header = rows[0].map(norm);
  const iName = header.indexOf('DESCRIPCION');
  const iStock = header.indexOf('STOCK');
  const iUnit = header.indexOf('UNIDAD DE MEDIDA');
  if (iName < 0 || iStock < 0) throw new Error(`Columnas inesperadas en la hoja ${sheet}`);
  return rows
    .slice(1)
    .map((r, i) => ({
      sheet,
      line: i + 2,
      name: text(r[iName]),
      brand: text(r[3]),
      code: text(r[2]),
      barcode: /^\d{8,14}$/.test(text(r[0])) ? text(r[0]) : '',
      unit: iUnit >= 0 ? text(r[iUnit]) : '',
      rawStock: r[iStock],
    }))
    .filter((r) => r.name);
}

async function main() {
  if (!fs.existsSync(FILE)) throw new Error(`Archivo no encontrado: ${FILE}`);
  const wb = XLSX.readFile(FILE);

  const products = readSheet(wb, 'INVENTARIO').map((r) => ({ ...r, stock: parseStock(r.rawStock) }));

  // Código único y estable entre importaciones: código de barras si no se repite; si no, huella del producto
  const barcodeCount = new Map<string, number>();
  products.forEach((p) => p.barcode && barcodeCount.set(p.barcode, (barcodeCount.get(p.barcode) || 0) + 1));
  const used = new Map<string, number>();
  const items = products.map((p) => {
    const base =
      p.barcode && barcodeCount.get(p.barcode) === 1
        ? p.barcode
        : 'LID-' + createHash('sha1').update(`${norm(p.name)}|${norm(p.brand)}|${norm(p.code)}`).digest('hex').slice(0, 8).toUpperCase();
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    return { ...p, itemCode: n === 1 ? base : `${base}-${n}`, repeated: n > 1 };
  });

  const old = await prisma.inventoryItem.findMany({
    select: {
      id: true,
      name: true,
      unitPrice: true,
      _count: { select: { orderLineItems: true, restockRequests: true, requestItems: true, dispatchItems: true } },
    },
  });
  const oldPrice = new Map(old.filter((o) => o.unitPrice > 0).map((o) => [norm(o.name), o.unitPrice]));
  const kept = old.filter((o) => Object.values(o._count).some((c) => c > 0));
  const keptIds = new Set(kept.map((k) => k.id));
  const removable = old.filter((o) => !keptIds.has(o.id)).map((o) => o.id);

  const toCount = items.filter((i) => i.stock === null);
  const withPrice = items.filter((i) => oldPrice.has(norm(i.name))).length;
  console.log(`Hoja INVENTARIO: ${products.length} productos (las demás hojas se ignoran)`);
  console.log(`Inventario nuevo: ${items.length} productos · ${items.reduce((s, i) => s + (i.stock ?? 0), 0)} unidades · ${items.filter((i) => (i.stock ?? 0) > 0).length} con stock`);
  console.log(`Por contar (stock ilegible o vacío, entran en 0): ${toCount.length} · filas repetidas conservadas: ${items.filter((i) => i.repeated).length}`);
  console.log(`Con precio heredado del catálogo anterior: ${withPrice} (el resto queda en 0)`);
  console.log(`Catálogo anterior: ${old.length} · se eliminan: ${removable.length} · se conservan en 0 por tener historial: ${kept.length}`);

  const csv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
  const review = items.filter((i) => i.stock === null || i.repeated);
  fs.writeFileSync(
    REPORT,
    '﻿' +
      ['motivo,hoja,fila,codigo,producto,marca,stock en el Excel,unidad']
        .concat(
          review.map((i) =>
            [i.stock === null ? 'por contar' : 'fila repetida', i.sheet, i.line, i.itemCode, i.name, i.brand, text(i.rawStock), i.unit].map(csv).join(',')
          )
        )
        .join('\r\n')
  );
  console.log(`Reporte para revisar (${review.length} filas): ${REPORT}`);

  if (!APPLY) {
    console.log('\nENSAYO: no se modificó la base. Usa --apply para aplicar.');
    return;
  }

  const category =
    (await prisma.category.findUnique({ where: { name: 'General' } })) ??
    (await prisma.category.create({ data: { name: 'General' } }));

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < removable.length; i += 5000) {
        await tx.inventoryItem.deleteMany({ where: { id: { in: removable.slice(i, i + 5000) } } });
      }
      await tx.inventoryItem.updateMany({ where: { id: { in: [...keptIds] } }, data: { quantity: 0, status: 'out_of_stock' } });
      for (let i = 0; i < items.length; i += 500) {
        await tx.inventoryItem.createMany({
          data: items.slice(i, i + 500).map((p) => {
            const quantity = p.stock ?? 0;
            return {
              code: p.itemCode,
              name: p.name.slice(0, 200),
              supplier: p.brand ? p.brand.slice(0, 120) : null,
              presentation: p.unit ? p.unit.slice(0, 80) : null,
              description:
                [p.code && `Código: ${p.code}`, p.barcode && p.barcode !== p.itemCode && `Barras: ${p.barcode}`, p.unit && `Unidad: ${p.unit}`]
                  .filter(Boolean)
                  .join(' · ') || null,
              categoryId: category.id,
              quantity,
              unitPrice: oldPrice.get(norm(p.name)) ?? 0,
              status: quantity === 0 ? 'out_of_stock' : quantity < 10 ? 'low_stock' : 'in_stock',
            };
          }),
        });
      }
    },
    { timeout: 180_000, maxWait: 20_000 }
  );

  const total = await prisma.inventoryItem.count();
  const sum = await prisma.inventoryItem.aggregate({ _sum: { quantity: true } });
  console.log(`\nAPLICADO. Productos en la base: ${total} · unidades: ${sum._sum.quantity}`);
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

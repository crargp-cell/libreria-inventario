import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser, handleError } from '@/lib/auth/guard';
import { STAFF } from '@/lib/auth/roles';
import { pageParams } from '@/lib/validate';
import { searchWords } from '@/lib/products';

// Inventario generalizado: SOLO una agrupación de InventoryItem.quantity (no hay segunda fuente de stock).
// Agrupa por producto genérico + color + tamaño + modelo + presentación, ignorando la marca.
// Un artículo sin "producto genérico" no se suma con ningún otro.

// Normaliza para comparar: sin mayúsculas, tildes ni espacios sobrantes
const norm = (column: string) =>
  Prisma.raw(`translate(lower(btrim(coalesce(i."${column}", ''))), 'ÁÉÍÓÚÜáéíóúüàèìòù', 'aeiouuaeiouuaeiou')`);

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, STAFF);
    const { searchParams } = new URL(req.url);
    const { skip, take } = pageParams(searchParams, 25);

    // La búsqueda y los filtros se aplican al GRUPO (HAVING), para que el total siempre sea el completo
    const having: Prisma.Sql[] = [];
    for (const word of searchWords(searchParams.get('q'))) {
      const like = `%${word.replace(/[\\%_]/g, '\\$&')}%`;
      having.push(Prisma.sql`bool_or(concat_ws(' ', i.name, i."genericName", i.code, i.supplier, i.color, i.size, i.model, i.presentation) ILIKE ${like})`);
    }
    const categoryId = searchParams.get('categoryId');
    if (categoryId) having.push(Prisma.sql`bool_or(i."categoryId" = ${categoryId})`);
    if (searchParams.get('onlyGrouped') === '1') having.push(Prisma.sql`bool_and(btrim(coalesce(i."genericName", '')) <> '')`);
    const havingSql = having.length ? Prisma.sql`HAVING ${Prisma.join(having, ' AND ')}` : Prisma.empty;

    const key = Prisma.sql`CASE WHEN btrim(coalesce(i."genericName", '')) = '' THEN 'item:' || i.id
      ELSE concat_ws('|', ${norm('genericName')}, ${norm('color')}, ${norm('size')}, ${norm('model')}, ${norm('presentation')}) END`;

    const [groups, count] = await Promise.all([
      prisma.$queryRaw<unknown[]>`
        SELECT ${key} AS "key",
               MIN(CASE WHEN btrim(coalesce(i."genericName", '')) <> '' THEN btrim(i."genericName") ELSE i.name END) AS product,
               MIN(NULLIF(btrim(i.color), '')) AS color,
               MIN(NULLIF(btrim(i.size), '')) AS size,
               MIN(NULLIF(btrim(i.model), '')) AS model,
               MIN(NULLIF(btrim(i.presentation), '')) AS presentation,
               SUM(i.quantity)::int AS "totalQuantity",
               COUNT(*)::int AS "itemCount",
               bool_and(btrim(coalesce(i."genericName", '')) <> '') AS grouped,
               json_agg(json_build_object('id', i.id, 'code', i.code, 'name', i.name, 'brand', i.supplier, 'quantity', i.quantity) ORDER BY i.supplier, i.code) AS members
        FROM "InventoryItem" i
        GROUP BY 1
        ${havingSql}
        ORDER BY grouped DESC, product ASC, 1 ASC
        LIMIT ${take} OFFSET ${skip}`,
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total FROM (
          SELECT ${key} FROM "InventoryItem" i GROUP BY 1 ${havingSql}
        ) g`,
    ]);

    return NextResponse.json({ groups, total: count[0]?.total ?? 0, skip, take });
  } catch (error) {
    return handleError(error, 'Error fetching grouped inventory:');
  }
}

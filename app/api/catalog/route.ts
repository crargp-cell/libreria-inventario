import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, handleError } from '@/lib/auth/guard';
import { pageParams } from '@/lib/validate';
import { searchWords } from '@/lib/products';

// Catálogo para solicitar productos. Lista blanca de campos: NUNCA incluye precios, costos,
// ni cantidades en stock (solo si hay disponibilidad).
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const { searchParams } = new URL(req.url);
    const { skip, take } = pageParams(searchParams, 20, 50);

    const where: any = {};
    const categoryId = searchParams.get('categoryId');
    if (categoryId) where.categoryId = categoryId;
    if (searchParams.get('available') === '1') where.quantity = { gt: 0 };
    const words = searchWords(searchParams.get('q'));
    if (words.length) {
      where.AND = words.map((w) => ({
        OR: ['name', 'code', 'supplier', 'genericName', 'color', 'size', 'model', 'presentation', 'description'].map((f) => ({
          [f]: { contains: w, mode: 'insensitive' },
        })),
      }));
    }

    const [rows, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          supplier: true,
          genericName: true,
          color: true,
          size: true,
          model: true,
          presentation: true,
          description: true,
          unitsPerPack: true,
          packName: true,
          quantity: true, // solo para calcular la disponibilidad; no se envía
          category: { select: { name: true } },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    const items = rows.map(({ quantity, ...item }) => ({ ...item, available: quantity > 0 }));
    return NextResponse.json({ items, total, skip, take });
  } catch (error) {
    return handleError(error, 'Error fetching catalog:');
  }
}

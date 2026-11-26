import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenFresh } from '@/lib/auth/session';
import { auditActions } from '@/lib/audit';
import { toInt, toMoney, toText, toImage, stockStatus } from '@/lib/validate';
import { readJson } from '@/lib/http';
import { MONEY, STAFF, has } from '@/lib/auth/roles';
import { ATTRIBUTE_FIELDS } from '@/lib/products';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyTokenFresh(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    // El vendedor no consulta el inventario (usa /api/catalog, sin precios ni cantidades)
    if (!has(STAFF, payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    // Paginación acotada: evita que un cliente pida miles de filas de una vez
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0') || 0);
    const take = Math.min(100, Math.max(1, parseInt(searchParams.get('take') || '20') || 20));

    // Construir filtro
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (searchParams.get('inStock') === '1') where.quantity = { gt: 0 };

    // Búsqueda por palabras (cualquier orden): todas deben aparecer en código, nombre, marca o detalle.
    // Prisma parametriza los valores, así que no hay inyección SQL.
    const words = (searchParams.get('q') || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .map((w) => w.slice(0, 50));
    if (words.length) {
      where.AND = words.map((w) => ({
        OR: [
          { name: { contains: w, mode: 'insensitive' } },
          { code: { contains: w, mode: 'insensitive' } },
          { supplier: { contains: w, mode: 'insensitive' } },
          { genericName: { contains: w, mode: 'insensitive' } },
          { color: { contains: w, mode: 'insensitive' } },
          { description: { contains: w, mode: 'insensitive' } },
        ],
      }));
    }

    const orderByMap: Record<string, any> = {
      name: { name: 'asc' },
      code: { code: 'asc' },
      ...(has(MONEY, payload.role) ? { price: { unitPrice: 'asc' } } : {}),
      quantity: { quantity: 'asc' },
    };
    const sortKey = searchParams.get('sort') || '';
    const orderBy = Object.hasOwn(orderByMap, sortKey) ? orderByMap[sortKey] : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: { category: true },
        skip,
        take,
        orderBy,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    const showPrices = has(MONEY, payload.role);
    return NextResponse.json({
      items: showPrices ? items : items.map(({ unitPrice, ...rest }) => rest),
      total,
      skip,
      take,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyTokenFresh(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Solo admin y superadmin pueden crear inventario
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await readJson(req, 4_000_000);

    // Validación estricta de cada campo (tipos, rangos y longitudes)
    const code = toText(body.code, 40);
    const name = toText(body.name, 200);
    const quantity = toInt(body.quantity, 0, 10_000_000);
    const minStockLevel = body.minStockLevel === undefined ? 10 : toInt(body.minStockLevel, 0, 10_000_000);
    const unitPrice = toMoney(body.unitPrice);
    const packSize = body.unitsPerPack === undefined ? 1 : toInt(body.unitsPerPack, 1, 100_000);
    const description = body.description ? toText(body.description, 500) : null;
    const supplier = body.supplier ? toText(body.supplier, 120) : null;
    const image = body.image ? toImage(body.image) : null;
    const attributes: Record<string, string | null> = {};
    for (const field of ATTRIBUTE_FIELDS) {
      attributes[field] = body[field] ? toText(body[field], 80) : null;
      if (body[field] && !attributes[field]) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
      }
    }

    if (!code || !name || typeof body.categoryId !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (quantity === null) {
      return NextResponse.json({ error: 'quantity must be an integer >= 0' }, { status: 400 });
    }
    if (minStockLevel === null) {
      return NextResponse.json({ error: 'minStockLevel must be an integer >= 0' }, { status: 400 });
    }
    if (unitPrice === null) {
      return NextResponse.json({ error: 'unitPrice must be a number >= 0 with up to 2 decimals' }, { status: 400 });
    }
    if (packSize === null) {
      return NextResponse.json({ error: 'unitsPerPack must be an integer between 1 and 100000' }, { status: 400 });
    }
    if ((body.description && !description) || (body.supplier && !supplier)) {
      return NextResponse.json({ error: 'Invalid description or supplier' }, { status: 400 });
    }
    if (body.image && !image) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }
    const packLabel = packSize > 1 ? toText(body.packName || 'Caja', 30) || 'Caja' : null;
    const categoryId: string = body.categoryId;

    // La categoría debe existir y estar activa
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (category.status === 'inactive') {
      return NextResponse.json({ error: 'Category is inactive' }, { status: 400 });
    }

    let item;
    try {
      item = await prisma.inventoryItem.create({
        data: {
          code,
          name,
          description,
          image,
          categoryId,
          quantity,
          unitsPerPack: packSize,
          packName: packLabel,
          minStockLevel,
          unitPrice,
          supplier,
          ...attributes,
          status: stockStatus(quantity, minStockLevel),
        },
        include: { category: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'Product code already exists' }, { status: 409 });
      }
      throw e;
    }

    // Log auditoría
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    await auditActions.inventoryCreated(
      payload.userId,
      item.id,
      { code, name, quantity, unitPrice },
      ipAddress || undefined
    );

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

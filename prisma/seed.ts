import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear categorías
  const categoriesData = [
    { name: 'Ficción', description: 'Novelas y historias ficticias' },
    { name: 'No Ficción', description: 'Libros educativos e informativos' },
    { name: 'Infantil', description: 'Libros para niños' },
    { name: 'Técnico', description: 'Libros técnicos y de programación' },
    { name: 'Poesía', description: 'Colecciones de poesía' },
  ];

  let categoriesCreated = 0;
  for (const cat of categoriesData) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!existing) {
      await prisma.category.create({ data: cat });
      categoriesCreated++;
    }
  }
  console.log(`✅ ${categoriesCreated} categorías creadas`);

  // Obtener IDs de categorías
  const cats = await prisma.category.findMany();
  const categoryIds = cats.map(c => c.id);

  // Crear usuarios de prueba
  const usersData = [
    {
      email: 'superadmin@example.com',
      name: 'Super Admin',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'superadmin',
      status: 'active',
    },
    {
      email: 'admin@example.com',
      name: 'Admin Usuario',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'admin',
      status: 'active',
    },
    {
      email: 'supervisor@example.com',
      name: 'Supervisor',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'supervisor',
      status: 'active',
    },
    {
      email: 'cajero1@example.com',
      name: 'Cajero 1',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'cajero',
      status: 'active',
    },
    {
      email: 'cajero2@example.com',
      name: 'Cajero 2',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'cajero',
      status: 'active',
    },
  ];

  let usersCreated = 0;
  for (const usr of usersData) {
    const existing = await prisma.user.findUnique({ where: { email: usr.email } });
    if (!existing) {
      await prisma.user.create({ data: usr });
      usersCreated++;
    }
  }
  console.log(`✅ ${usersCreated} usuarios creados`);

  // Crear productos
  const productsData = [
    {
      code: 'LIB001',
      name: 'Clean Code',
      description: 'Una guía para escribir código limpio',
      categoryId: categoryIds[3], // Técnico
      quantity: 15,
      minStockLevel: 5,
      unitPrice: 45.99,
      supplier: 'Editorial Tech',
      status: 'in_stock',
    },
    {
      code: 'LIB002',
      name: 'El Quijote',
      description: 'Clásico de la literatura española',
      categoryId: categoryIds[0], // Ficción
      quantity: 3,
      minStockLevel: 10,
      unitPrice: 25.50,
      supplier: 'Editorial Clásica',
      status: 'low_stock',
    },
    {
      code: 'LIB003',
      name: 'Harry Potter y la Piedra Filosofal',
      description: 'El primer libro de la saga',
      categoryId: categoryIds[2], // Infantil
      quantity: 0,
      minStockLevel: 8,
      unitPrice: 20.00,
      supplier: 'Editorial Infantil',
      status: 'out_of_stock',
    },
    {
      code: 'LIB004',
      name: 'Programación en JavaScript',
      description: 'Guía completa de JavaScript moderno',
      categoryId: categoryIds[3], // Técnico
      quantity: 22,
      minStockLevel: 5,
      unitPrice: 55.00,
      supplier: 'Editorial Tech',
      status: 'in_stock',
    },
    {
      code: 'LIB005',
      name: 'Poesía Completa de Neruda',
      description: 'Obras completas del poeta chileno',
      categoryId: categoryIds[4], // Poesía
      quantity: 7,
      minStockLevel: 3,
      unitPrice: 35.75,
      supplier: 'Editorial Poesía',
      status: 'in_stock',
    },
    {
      code: 'LIB006',
      name: 'Historia del Mundo',
      description: 'Enciclopedia histórica completa',
      categoryId: categoryIds[1], // No Ficción
      quantity: 5,
      minStockLevel: 3,
      unitPrice: 65.00,
      supplier: 'Editorial Historia',
      status: 'in_stock',
    },
  ];

  let productsCreated = 0;
  for (const prod of productsData) {
    const existing = await prisma.inventoryItem.findUnique({ where: { code: prod.code } });
    if (!existing) {
      await prisma.inventoryItem.create({ data: prod });
      productsCreated++;
    }
  }

  console.log(`✅ ${productsCreated} productos creados`);

  // Crear órdenes de ejemplo
  const inventoryItems = await prisma.inventoryItem.findMany();
  if (inventoryItems.length >= 2) {
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    const cajeroUser = await prisma.user.findFirst({ where: { role: 'cajero' } });

    if (adminUser && cajeroUser) {
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          total: 91.99,
          status: 'completed',
          createdById: cajeroUser.id,
          lineItems: {
            createMany: {
              data: [
                {
                  inventoryItemId: inventoryItems[0].id,
                  quantity: 1,
                  unitPrice: 45.99,
                },
                {
                  inventoryItemId: inventoryItems[1].id,
                  quantity: 2,
                  unitPrice: 23.00,
                },
              ],
            },
          },
        },
      });

      console.log(`✅ Orden de ejemplo creada: ${order.orderNumber}`);
    }
  }

  console.log('🎉 ¡Seed completado!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('  Superadmin: superadmin@example.com / password123');
  console.log('  Admin: admin@example.com / password123');
  console.log('  Supervisor: supervisor@example.com / password123');
  console.log('  Cajero: cajero1@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

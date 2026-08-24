import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importProducts() {
  console.log('📂 Leyendo archivo Excel...');

  // Leer el archivo Excel
  const filePath = path.join(__dirname, '..', 'inventario_goma_eva_transcrito.xlsx');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ ${data.length} filas encontradas en el Excel`);

  // Crear categoría por defecto si no existe
  let defaultCategory = await prisma.category.findUnique({
    where: { name: 'Importados' }
  });

  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Importados',
        description: 'Productos importados desde Excel'
      }
    });
    console.log('✅ Categoría "Importados" creada');
  }

  // Eliminar productos antiguos (opcionales)
  const deletedCount = await prisma.inventoryItem.deleteMany({});
  console.log(`🗑️  ${deletedCount.count} productos antiguos eliminados`);

  // Importar nuevos productos
  let productsCreated = 0;

  for (const row of data as any[]) {
    try {
      // Mapear columnas del Excel (estructura del archivo de Goma Eva)
      const code = row['CÓDIGO'] || `PROD-${Date.now()}`;
      const description = row['DESCRIPCIÓN'] || 'Producto sin nombre';
      const stock = parseInt(row['STOCK'] || 0);
      const unitMeasure = row['UNIDAD DE MEDIDA'] || '';

      const productData = {
        code: String(code),
        name: description,
        description: `${unitMeasure}`,
        categoryId: defaultCategory.id,
        quantity: stock,
        minStockLevel: Math.ceil(stock * 0.3), // 30% del stock actual como mínimo
        unitPrice: 5.00, // Precio por defecto - será ajustado luego
        supplier: row['MARCA'] || 'No especificado',
        status: stock === 0 ? 'out_of_stock' as const : stock < 10 ? 'low_stock' as const : 'in_stock' as const,
      };

      // Validar datos
      if (!productData.name) {
        console.warn(`⚠️  Fila ignorada - sin descripción: ${JSON.stringify(row)}`);
        continue;
      }

      // Crear producto
      await prisma.inventoryItem.create({
        data: productData
      });

      productsCreated++;
      console.log(`✅ ${productData.code} - ${productData.name} ($${productData.unitPrice})`);
    } catch (error) {
      console.error(`❌ Error al crear producto:`, error);
    }
  }

  console.log(`\n🎉 Importación completada: ${productsCreated} productos creados`);

  // Mostrar resumen
  const stats = await prisma.inventoryItem.aggregate({
    _count: true,
    _sum: { quantity: true },
  });

  console.log(`\n📊 Resumen de inventario:`);
  console.log(`   Total de productos: ${stats._count}`);
  console.log(`   Total en stock: ${stats._sum.quantity || 0} unidades`);
}

importProducts()
  .catch((e) => {
    console.error('❌ Error en importación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

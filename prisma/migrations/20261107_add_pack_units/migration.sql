-- Empaque por producto: el stock (quantity) sigue en la unidad mínima de venta (piezas);
-- unitsPerPack indica cuántas piezas trae una caja/paquete y packName cómo se llama.
ALTER TABLE "InventoryItem" ADD COLUMN "packName" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "unitsPerPack" INTEGER NOT NULL DEFAULT 1;

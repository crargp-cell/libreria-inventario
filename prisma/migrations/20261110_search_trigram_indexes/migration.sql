-- Búsqueda de productos rápida: la búsqueda usa ILIKE '%palabra%' sobre 4 columnas, que sin índice
-- recorre toda la tabla (~150 ms con 10.800 productos y crece con el catálogo).
-- Los índices GIN de trigramas permiten usar índice en ILIKE/LIKE con comodín al inicio.
-- Nota: estos índices no están declarados en schema.prisma (Prisma no los modela sin una vista previa),
-- así que `prisma migrate dev` podría proponer eliminarlos: no aceptarlo.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "InventoryItem_name_trgm_idx" ON "InventoryItem" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "InventoryItem_code_trgm_idx" ON "InventoryItem" USING GIN ("code" gin_trgm_ops);
CREATE INDEX "InventoryItem_supplier_trgm_idx" ON "InventoryItem" USING GIN ("supplier" gin_trgm_ops);
CREATE INDEX "InventoryItem_description_trgm_idx" ON "InventoryItem" USING GIN ("description" gin_trgm_ops);

-- Orden alfabético (vista por defecto del inventario) sin ordenar toda la tabla
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem" ("name");

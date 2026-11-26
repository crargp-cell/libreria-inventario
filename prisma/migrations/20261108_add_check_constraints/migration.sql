-- Última línea de defensa: aunque falle una validación del código, la BD rechaza datos imposibles
-- (stock negativo, precios negativos, cantidades de venta o reposición <= 0).
ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_quantity_nonneg" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "InventoryItem_minStockLevel_nonneg" CHECK ("minStockLevel" >= 0),
  ADD CONSTRAINT "InventoryItem_unitPrice_nonneg" CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT "InventoryItem_unitsPerPack_positive" CHECK ("unitsPerPack" >= 1);

ALTER TABLE "OrderLineItem"
  ADD CONSTRAINT "OrderLineItem_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderLineItem_unitPrice_nonneg" CHECK ("unitPrice" >= 0);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_total_nonneg" CHECK ("total" >= 0);

ALTER TABLE "RestockRequest"
  ADD CONSTRAINT "RestockRequest_quantity_positive" CHECK ("quantityRequested" > 0);

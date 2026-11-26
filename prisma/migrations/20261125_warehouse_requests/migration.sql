-- Gestión de almacén: atributos de agrupación, solicitudes, despachos y rol vendedor.
-- (Los índices de trigramas creados a mano se conservan: se quitaron los DROP INDEX que proponía Prisma.)

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "color" TEXT,
ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "presentation" TEXT,
ADD COLUMN     "size" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'vendedor';

-- CreateTable
CREATE TABLE "StockRequest" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requesterId" TEXT NOT NULL,
    "note" TEXT,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "brand" TEXT,
    "details" TEXT,
    "requestedQty" INTEGER NOT NULL,
    "approvedQty" INTEGER,
    "dispatchedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dispatchedById" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "note" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchItem" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,

    CONSTRAINT "DispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockRequest_number_key" ON "StockRequest"("number");

-- CreateIndex
CREATE INDEX "StockRequest_requesterId_idx" ON "StockRequest"("requesterId");

-- CreateIndex
CREATE INDEX "StockRequest_status_idx" ON "StockRequest"("status");

-- CreateIndex
CREATE INDEX "StockRequest_createdAt_idx" ON "StockRequest"("createdAt");

-- CreateIndex
CREATE INDEX "StockRequestItem_inventoryItemId_idx" ON "StockRequestItem"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockRequestItem_requestId_inventoryItemId_key" ON "StockRequestItem"("requestId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_number_key" ON "Dispatch"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_idempotencyKey_key" ON "Dispatch"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Dispatch_requestId_idx" ON "Dispatch"("requestId");

-- CreateIndex
CREATE INDEX "Dispatch_type_idx" ON "Dispatch"("type");

-- CreateIndex
CREATE INDEX "Dispatch_createdAt_idx" ON "Dispatch"("createdAt");

-- CreateIndex
CREATE INDEX "Dispatch_dispatchedById_idx" ON "Dispatch"("dispatchedById");

-- CreateIndex
CREATE INDEX "Dispatch_receivedById_idx" ON "Dispatch"("receivedById");

-- CreateIndex
CREATE INDEX "DispatchItem_dispatchId_idx" ON "DispatchItem"("dispatchId");

-- CreateIndex
CREATE INDEX "DispatchItem_requestItemId_idx" ON "DispatchItem"("requestItemId");

-- CreateIndex
CREATE INDEX "DispatchItem_inventoryItemId_idx" ON "DispatchItem"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StockRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StockRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "StockRequestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- El rol cajero pasa a llamarse vendedor
UPDATE "User" SET "role" = 'vendedor' WHERE "role" = 'cajero';

ALTER TABLE "User" ADD CONSTRAINT "User_role_valid"
  CHECK ("role" IN ('superadmin', 'admin', 'supervisor', 'encargado', 'vendedor'));

ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_status_valid"
  CHECK ("status" IN ('pending', 'approved', 'partially_dispatched', 'dispatched', 'rejected', 'cancelled'));

-- Nunca se despacha más de lo aprobado, ni se aprueba más de lo pedido
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_quantities_valid"
  CHECK ("requestedQty" > 0
     AND ("approvedQty" IS NULL OR ("approvedQty" >= 0 AND "approvedQty" <= "requestedQty"))
     AND "dispatchedQty" >= 0
     AND "dispatchedQty" <= COALESCE("approvedQty", 0));

ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_type_valid" CHECK ("type" IN ('venta', 'reposicion'));

ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_quantities_valid"
  CHECK ("quantity" > 0 AND "stockAfter" >= 0 AND "stockBefore" - "quantity" = "stockAfter");

-- Un despacho registrado no se modifica ni se borra (trazabilidad)
CREATE OR REPLACE FUNCTION dispatch_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Los despachos son de solo escritura: % no permitido en %', TG_OP, TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dispatch_no_change BEFORE UPDATE OR DELETE ON "Dispatch"
  FOR EACH ROW EXECUTE FUNCTION dispatch_immutable();
CREATE TRIGGER dispatch_item_no_change BEFORE UPDATE OR DELETE ON "DispatchItem"
  FOR EACH ROW EXECUTE FUNCTION dispatch_immutable();
CREATE TRIGGER dispatch_no_truncate BEFORE TRUNCATE ON "Dispatch"
  FOR EACH STATEMENT EXECUTE FUNCTION dispatch_immutable();
CREATE TRIGGER dispatch_item_no_truncate BEFORE TRUNCATE ON "DispatchItem"
  FOR EACH STATEMENT EXECUTE FUNCTION dispatch_immutable();

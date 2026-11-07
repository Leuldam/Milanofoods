-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InventoryType" AS ENUM ('RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOOD');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIVE', 'ADJUSTMENT', 'PRODUCTION_CONSUMPTION', 'DAMAGE_WASTAGE', 'RETURN');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedStaff" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'WEBSITE';

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InventoryType" NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2),
    "supplier" TEXT,
    "location" TEXT DEFAULT 'Main Warehouse',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStockMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "change" DECIMAL(12,3) NOT NULL,
    "previousStock" DECIMAL(12,3) NOT NULL,
    "newStock" DECIMAL(12,3) NOT NULL,
    "type" "MovementType" NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT,
    "expectedOutputQty" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "outputUnit" TEXT NOT NULL DEFAULT 'units',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recipeId" TEXT,
    "plannedQuantity" INTEGER NOT NULL,
    "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "consumptionMethod" TEXT NOT NULL DEFAULT 'RECIPE',
    "productionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "responsibleStaff" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchMaterialUsage" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "plannedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "actualQuantity" DECIMAL(12,3) NOT NULL,
    "wastageQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,

    CONSTRAINT "BatchMaterialUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "address" TEXT,
    "city" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'RETAIL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'TELEGRAM',
    "recipient" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_type_isActive_idx" ON "InventoryItem"("type", "isActive");

-- CreateIndex
CREATE INDEX "InventoryStockMovement_inventoryItemId_createdAt_idx" ON "InventoryStockMovement"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "Recipe_productId_idx" ON "Recipe"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_recipeId_inventoryItemId_key" ON "RecipeItem"("recipeId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_batchNumber_key" ON "ProductionBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "ProductionBatch_productId_status_idx" ON "ProductionBatch"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductionBatch_productionDate_idx" ON "ProductionBatch"("productionDate");

-- CreateIndex
CREATE INDEX "BatchMaterialUsage_batchId_idx" ON "BatchMaterialUsage"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_orderId_createdAt_idx" ON "Payment"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockMovement" ADD CONSTRAINT "InventoryStockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMaterialUsage" ADD CONSTRAINT "BatchMaterialUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMaterialUsage" ADD CONSTRAINT "BatchMaterialUsage_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

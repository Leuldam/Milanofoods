CREATE TABLE "ProductPriceChange" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "previousPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductPriceChange_productId_createdAt_idx" ON "ProductPriceChange"("productId", "createdAt");

ALTER TABLE "ProductPriceChange" ADD CONSTRAINT "ProductPriceChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

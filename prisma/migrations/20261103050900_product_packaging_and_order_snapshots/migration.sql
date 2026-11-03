ALTER TABLE "Product"
ADD COLUMN "sku" TEXT,
ADD COLUMN "galleryImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "minimumOrderQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "promotionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotionDiscountPercent" DECIMAL(5,2);

UPDATE "Product" SET "sku" = UPPER("slug");
ALTER TABLE "Product" ALTER COLUMN "sku" SET NOT NULL;
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

CREATE TABLE "ProductPackagingOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "unitsPerPackage" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductPackagingOption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductPackagingOption_unitsPerPackage_check" CHECK ("unitsPerPackage" > 1)
);

CREATE UNIQUE INDEX "ProductPackagingOption_productId_label_key"
ON "ProductPackagingOption"("productId", "label");
CREATE INDEX "ProductPackagingOption_productId_isEnabled_idx"
ON "ProductPackagingOption"("productId", "isEnabled");

ALTER TABLE "ProductPackagingOption"
ADD CONSTRAINT "ProductPackagingOption_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_minimumOrderQuantity_check" CHECK ("minimumOrderQuantity" > 0),
ADD CONSTRAINT "Product_promotionDiscountPercent_check"
CHECK ("promotionDiscountPercent" IS NULL OR ("promotionDiscountPercent" >= 0 AND "promotionDiscountPercent" < 100));

ALTER TABLE "OrderItem"
ADD COLUMN "productFlavor" TEXT,
ADD COLUMN "productSku" TEXT,
ADD COLUMN "productVariantType" TEXT,
ADD COLUMN "packagingLabel" TEXT NOT NULL DEFAULT 'Single unit',
ADD COLUMN "unitsPerPackage" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "packageQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "listUnitPrice" DECIMAL(12,2);
ALTER TABLE "OrderItem"
ADD COLUMN "promotionApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotionDiscountPercent" DECIMAL(5,2);

UPDATE "OrderItem"
SET "packageQuantity" = "quantity",
    "listUnitPrice" = "unitPrice";

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_unitsPerPackage_check" CHECK ("unitsPerPackage" > 0),
ADD CONSTRAINT "OrderItem_packageQuantity_check" CHECK ("packageQuantity" > 0);

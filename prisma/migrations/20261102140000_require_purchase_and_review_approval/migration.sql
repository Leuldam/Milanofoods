ALTER TABLE "ProductReview"
    ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "orderId" TEXT;

CREATE INDEX "ProductReview_isApproved_createdAt_idx" ON "ProductReview"("isApproved", "createdAt");
CREATE UNIQUE INDEX "ProductReview_orderId_productId_key" ON "ProductReview"("orderId", "productId");

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

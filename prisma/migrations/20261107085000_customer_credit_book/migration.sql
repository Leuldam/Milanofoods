CREATE TYPE "CustomerCreditType" AS ENUM ('CREDIT', 'REPAYMENT');

CREATE TABLE "CustomerCreditTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CustomerCreditType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerCreditItem" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "CustomerCreditItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerCreditTransaction_customerId_createdAt_idx" ON "CustomerCreditTransaction"("customerId", "createdAt");
CREATE INDEX "CustomerCreditTransaction_type_createdAt_idx" ON "CustomerCreditTransaction"("type", "createdAt");
CREATE INDEX "CustomerCreditItem_transactionId_idx" ON "CustomerCreditItem"("transactionId");

ALTER TABLE "CustomerCreditTransaction" ADD CONSTRAINT "CustomerCreditTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerCreditItem" ADD CONSTRAINT "CustomerCreditItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "CustomerCreditTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCreditItem" ADD CONSTRAINT "CustomerCreditItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

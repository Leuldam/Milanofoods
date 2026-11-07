CREATE TYPE "CustomerCrmStage" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CUSTOMER', 'LOST');

ALTER TABLE "Customer"
ADD COLUMN "crmStage" "CustomerCrmStage" NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN "crmLeadSource" TEXT,
ADD COLUMN "assignedTo" TEXT,
ADD COLUMN "nextFollowUpAt" TIMESTAMP(3);

CREATE TABLE "CustomerCrmActivity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "followUpAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCrmActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_crmStage_nextFollowUpAt_idx" ON "Customer"("crmStage", "nextFollowUpAt");
CREATE INDEX "Customer_assignedTo_crmStage_idx" ON "Customer"("assignedTo", "crmStage");
CREATE INDEX "CustomerCrmActivity_customerId_createdAt_idx" ON "CustomerCrmActivity"("customerId", "createdAt");
CREATE INDEX "CustomerCrmActivity_followUpAt_idx" ON "CustomerCrmActivity"("followUpAt");

ALTER TABLE "CustomerCrmActivity"
ADD CONSTRAINT "CustomerCrmActivity_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
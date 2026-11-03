CREATE TABLE "PaymentMethodConfig" (
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("code")
);

INSERT INTO "PaymentMethodConfig" ("code", "displayName", "updatedAt") VALUES
    ('cbe', 'Commercial Bank of Ethiopia', CURRENT_TIMESTAMP),
    ('telebirr', 'Telebirr', CURRENT_TIMESTAMP),
    ('awash', 'Awash Bank', CURRENT_TIMESTAMP),
    ('boa', 'Bank of Abyssinia', CURRENT_TIMESTAMP);

CREATE TABLE "OrderPaymentProof" (
    "orderId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPaymentProof_pkey" PRIMARY KEY ("orderId")
);

ALTER TABLE "OrderPaymentProof" ADD CONSTRAINT "OrderPaymentProof_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

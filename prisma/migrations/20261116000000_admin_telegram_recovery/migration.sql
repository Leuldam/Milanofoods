ALTER TABLE "AdminUser"
ADD COLUMN "telegramChatId" TEXT,
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "AdminUser_telegramChatId_key" ON "AdminUser"("telegramChatId");

CREATE TABLE "AdminVerificationCode" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "telegramChatId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "requesterIp" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminVerificationCode_phone_purpose_createdAt_idx"
ON "AdminVerificationCode"("phone", "purpose", "createdAt");

CREATE INDEX "AdminVerificationCode_requesterIp_createdAt_idx"
ON "AdminVerificationCode"("requesterIp", "createdAt");

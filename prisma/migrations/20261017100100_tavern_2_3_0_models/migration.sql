-- Tavern 2.3.0
ALTER TABLE "Business"
  ADD COLUMN "allergenNote" TEXT,
  ADD COLUMN "googleReviewUrl" TEXT,
  ADD COLUMN "reviewClicks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "invoiceProvider" TEXT NOT NULL DEFAULT 'none';

ALTER TABLE "Product"
  ADD COLUMN "aiPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ingredientsText" TEXT,
  ADD COLUMN "containsAlcohol" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "containsPork" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allergenKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Payment" ADD COLUMN "methodDetail" TEXT;

ALTER TABLE "AdminUser"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorLastStep" INTEGER;

CREATE TYPE "DeviceKind" AS ENUM ('PRINT_AGENT', 'DESKTOP', 'MOBILE');
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PRINTING', 'DONE', 'FAILED');
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TABLE "DeviceToken" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "kind" "DeviceKind" NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdById" TEXT,
  "lastSeenAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceToken_tokenHash_key" ON "DeviceToken"("tokenHash");
CREATE INDEX "DeviceToken_businessId_kind_idx" ON "DeviceToken"("businessId", "kind");
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PrintJob" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "printerKey" TEXT NOT NULL DEFAULT 'kitchen',
  "payload" JSONB NOT NULL,
  "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMP(3),
  "claimedBy" TEXT,
  "doneAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PrintJob_businessId_status_createdAt_idx" ON "PrintJob"("businessId", "status", "createdAt");
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InvoiceRecord" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "externalId" TEXT,
  "pdfUrl" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvoiceRecord_orderId_key" ON "InvoiceRecord"("orderId");
CREATE INDEX "InvoiceRecord_businessId_status_idx" ON "InvoiceRecord"("businessId", "status");
ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Güvenlik: 2.3.0 öncesi AI etiketleri işletme onayı olmadan otomatik "onaylı" oluyordu.
-- Hepsi yeniden incelemeye alınır (müşteriye, işletme "AI Etiket Onayı" ekranında onaylayana kadar gösterilmez).
UPDATE "Product"
SET "aiApproved" = false, "aiPending" = true
WHERE "aiApproved" = true AND ("calories" IS NOT NULL OR cardinality("allergens") > 0);

-- Tavern 2.2.1

ALTER TABLE "User" ADD COLUMN "passwordEncrypted" TEXT;
ALTER TABLE "Business" ADD COLUMN "geofenceEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BarberSettings" ADD COLUMN "workDays" INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,0]::INTEGER[];

ALTER TABLE "AdminUser" ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "keyFingerprint" TEXT,
  ADD COLUMN "createdByLabel" TEXT;
CREATE UNIQUE INDEX "AdminUser_keyFingerprint_key" ON "AdminUser"("keyFingerprint");

ALTER TABLE "BusinessInfo" ADD COLUMN "youtubeUrl" TEXT,
  ADD COLUMN "facebookUrl" TEXT,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "mapsUrl" TEXT;

ALTER TABLE "BusinessSubscription" ADD COLUMN "paymentWindowStart" TIMESTAMP(3),
  ADD COLUMN "paymentWindowDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "businessNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "adminNotifiedAt" TIMESTAMP(3);

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "valueEnc" TEXT NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AdminNotification" (
  "id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "businessId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

ALTER TABLE "Notification" ADD COLUMN "targetUserId" TEXT;

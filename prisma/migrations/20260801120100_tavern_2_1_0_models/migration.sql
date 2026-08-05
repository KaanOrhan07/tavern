ALTER TABLE "BarberSettings" ADD COLUMN IF NOT EXISTS "responseTimeoutMinutes" INTEGER NOT NULL DEFAULT 60;

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "customerProfileId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "proposedStartAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "proposedEndAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "statusNote" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Appointment" SET status = 'APPROVED' WHERE status = 'BOOKED';
UPDATE "Appointment" SET status = 'CANCELLED_BY_CUSTOMER' WHERE status = 'CANCELLED';

ALTER TABLE "Appointment" ALTER COLUMN status SET DEFAULT 'PENDING_BUSINESS_APPROVAL';

CREATE INDEX IF NOT EXISTS "Appointment_businessId_status_idx" ON "Appointment"("businessId", "status");
CREATE INDEX IF NOT EXISTS "Appointment_expiresAt_idx" ON "Appointment"("expiresAt");

CREATE TABLE IF NOT EXISTS "AppointmentStatusHistory" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "changedById" TEXT,
    "changedByRole" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AppointmentStatusHistory_appointmentId_createdAt_idx" ON "AppointmentStatusHistory"("appointmentId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AvailabilityException" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AvailabilityException_businessId_date_idx" ON "AvailabilityException"("businessId", "date");
CREATE INDEX IF NOT EXISTS "AvailabilityException_staffId_date_idx" ON "AvailabilityException"("staffId", "date");
DO $$ BEGIN
  ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CustomerProfile" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "pinHash" TEXT,
    "fullName" TEXT,
    "birthDate" TIMESTAMP(3),
    "preferredLocale" TEXT NOT NULL DEFAULT 'tr',
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "forcePinChange" BOOLEAN NOT NULL DEFAULT false,
    "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_phone_key" ON "CustomerProfile"("phone");

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "BusinessInfo" (
    "businessId" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "websiteUrl" TEXT,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessInfo_pkey" PRIMARY KEY ("businessId")
);
DO $$ BEGIN
  ALTER TABLE "BusinessInfo" ADD CONSTRAINT "BusinessInfo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "BusinessSubscription" (
    "businessId" TEXT NOT NULL,
    "paymentDueDay" INTEGER NOT NULL DEFAULT 1,
    "paymentStatus" TEXT NOT NULL DEFAULT 'current',
    "lastPaymentDate" TIMESTAMP(3),
    "nextPaymentDate" TIMESTAMP(3),
    "monthlyFeeKurus" INTEGER,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessSubscription_pkey" PRIMARY KEY ("businessId")
);
DO $$ BEGIN
  ALTER TABLE "BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PaymentRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "amountKurus" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaymentRecord_businessId_paidAt_idx" ON "PaymentRecord"("businessId", "paidAt");
DO $$ BEGIN
  ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "LoyaltyConfig" ADD COLUMN IF NOT EXISTS "earningMode" TEXT NOT NULL DEFAULT 'spend_based';
ALTER TABLE "LoyaltyConfig" ADD COLUMN IF NOT EXISTS "fixedPointsPerCompletion" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "LoyaltyConfig" ADD COLUMN IF NOT EXISTS "tierSystemEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LoyaltyConfig" ADD COLUMN IF NOT EXISTS "referralInviterPoints" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "LoyaltyConfig" ADD COLUMN IF NOT EXISTS "referralInviteePoints" INTEGER NOT NULL DEFAULT 25;

CREATE TABLE IF NOT EXISTS "LoyaltyTier" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "minLifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "pointMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rankOrder" INTEGER NOT NULL DEFAULT 0,
    "perks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyTier_businessId_tierName_key" ON "LoyaltyTier"("businessId", "tierName");
CREATE INDEX IF NOT EXISTS "LoyaltyTier_businessId_minLifetimePoints_idx" ON "LoyaltyTier"("businessId", "minLifetimePoints");
DO $$ BEGIN
  ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "LoyaltyAccount" ADD COLUMN IF NOT EXISTS "lifetimeEarnedPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LoyaltyAccount" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "LoyaltyAccount" ADD COLUMN IF NOT EXISTS "referredByPhone" TEXT;
ALTER TABLE "LoyaltyAccount" ADD COLUMN IF NOT EXISTS "tierId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_referralCode_key" ON "LoyaltyAccount"("referralCode");
CREATE INDEX IF NOT EXISTS "LoyaltyAccount_businessId_lifetimeEarnedPoints_idx" ON "LoyaltyAccount"("businessId", "lifetimeEarnedPoints");
DO $$ BEGIN
  ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "loyaltyAccountId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceEntityId" TEXT,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_businessId_createdAt_idx" ON "LoyaltyTransaction"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_loyaltyAccountId_createdAt_idx" ON "LoyaltyTransaction"("loyaltyAccountId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_loyaltyAccountId_fkey" FOREIGN KEY ("loyaltyAccountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

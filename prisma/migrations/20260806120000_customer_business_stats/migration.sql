-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerBusinessStats" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "firstVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "totalSpentKurus" INTEGER NOT NULL DEFAULT 0,
    "favoriteProductId" TEXT,
    "favoriteServiceId" TEXT,
    "favoriteCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerBusinessStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerBusinessStats_customerProfileId_businessId_key" ON "CustomerBusinessStats"("customerProfileId", "businessId");
CREATE INDEX IF NOT EXISTS "CustomerBusinessStats_businessId_lastVisitAt_idx" ON "CustomerBusinessStats"("businessId", "lastVisitAt");
CREATE INDEX IF NOT EXISTS "CustomerBusinessStats_customerProfileId_totalVisits_idx" ON "CustomerBusinessStats"("customerProfileId", "totalVisits");

DO $$ BEGIN
  ALTER TABLE "CustomerBusinessStats" ADD CONSTRAINT "CustomerBusinessStats_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerBusinessStats" ADD CONSTRAINT "CustomerBusinessStats_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Organization
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "Business_organizationId_idx" ON "Business"("organizationId");

DO $$ BEGIN
  ALTER TABLE "Business" ADD CONSTRAINT "Business_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");
DO $$ BEGIN
  ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FloorArea + Table layout
CREATE TABLE IF NOT EXISTS "FloorArea" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1000,
    "height" INTEGER NOT NULL DEFAULT 700,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FloorArea_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FloorArea_businessId_name_key" ON "FloorArea"("businessId", "name");
DO $$ BEGIN
  ALTER TABLE "FloorArea" ADD CONSTRAINT "FloorArea_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "floorAreaId" TEXT;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "capacity" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "shape" TEXT NOT NULL DEFAULT 'square';
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "posX" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "posY" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "width" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "height" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "rotation" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Table_floorAreaId_idx" ON "Table"("floorAreaId");
DO $$ BEGIN
  ALTER TABLE "Table" ADD CONSTRAINT "Table_floorAreaId_fkey" FOREIGN KEY ("floorAreaId") REFERENCES "FloorArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- OrderItem status
DO $$ BEGIN
  CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "preparingAt" TIMESTAMP(3);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP(3);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_status_idx" ON "OrderItem"("orderId", "status");

UPDATE "OrderItem" SET "status" = 'READY', "readyAt" = "preparedAt" WHERE "prepared" = true AND "delivered" = false;
UPDATE "OrderItem" SET "status" = 'DELIVERED', "deliveredAt" = COALESCE("preparedAt", NOW()) WHERE "delivered" = true;

-- Customer
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "birthDate" TIMESTAMP(3),
    "preferredLocale" "Locale",
    "totalSpendKurus" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_businessId_phone_key" ON "Customer"("businessId", "phone");
CREATE INDEX IF NOT EXISTS "Customer_businessId_lastOrderAt_idx" ON "Customer"("businessId", "lastOrderAt");
DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Expense
DO $$ BEGIN
  CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SALARY', 'SUPPLIER', 'UTILITIES', 'TAX', 'MAINTENANCE', 'MARKETING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "amountKurus" INTEGER NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "documentUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Expense_businessId_expenseDate_idx" ON "Expense"("businessId", "expenseDate");
DO $$ BEGIN
  ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Menu analysis + events
DO $$ BEGIN
  CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "MenuEventType" AS ENUM ('MENU_VIEW', 'CATEGORY_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'ORDER_SUBMITTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MenuAnalysis" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "inputData" JSONB NOT NULL,
    "resultData" JSONB,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "MenuAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MenuAnalysis_businessId_createdAt_idx" ON "MenuAnalysis"("businessId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "MenuAnalysis" ADD CONSTRAINT "MenuAnalysis_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MenuEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tableId" TEXT,
    "sessionId" TEXT NOT NULL,
    "type" "MenuEventType" NOT NULL,
    "categoryId" TEXT,
    "productId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MenuEvent_businessId_createdAt_idx" ON "MenuEvent"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "MenuEvent_businessId_productId_type_createdAt_idx" ON "MenuEvent"("businessId", "productId", "type", "createdAt");
DO $$ BEGIN
  ALTER TABLE "MenuEvent" ADD CONSTRAINT "MenuEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

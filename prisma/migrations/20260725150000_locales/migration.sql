-- CreateEnum Locale
DO $$ BEGIN
  CREATE TYPE "Locale" AS ENUM ('TR', 'EN', 'ES', 'DE', 'RU', 'AR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable User: locale preference
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" "Locale" NOT NULL DEFAULT 'TR';

-- CreateTable BusinessLocaleSettings
CREATE TABLE IF NOT EXISTS "BusinessLocaleSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "defaultLocale" "Locale" NOT NULL DEFAULT 'TR',
    "enabledLocales" "Locale"[] NOT NULL DEFAULT ARRAY['TR']::"Locale"[],
    "autoDetect" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessLocaleSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessLocaleSettings_businessId_key" ON "BusinessLocaleSettings"("businessId");

DO $$ BEGIN
  ALTER TABLE "BusinessLocaleSettings" ADD CONSTRAINT "BusinessLocaleSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable CategoryTranslation
CREATE TABLE IF NOT EXISTS "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

DO $$ BEGIN
  ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable ProductTranslation
CREATE TABLE IF NOT EXISTS "ProductTranslation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

DO $$ BEGIN
  ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable ProductVariantTranslation
CREATE TABLE IF NOT EXISTS "ProductVariantTranslation" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVariantTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariantTranslation_variantId_locale_key" ON "ProductVariantTranslation"("variantId", "locale");

DO $$ BEGIN
  ALTER TABLE "ProductVariantTranslation" ADD CONSTRAINT "ProductVariantTranslation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ThemeSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "presetKey" TEXT NOT NULL DEFAULT 'modern-dark',
    "primaryColor" TEXT NOT NULL DEFAULT '#D4A857',
    "secondaryColor" TEXT NOT NULL DEFAULT '#141311',
    "accentColor" TEXT NOT NULL DEFAULT '#E8C88A',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0A0A0A',
    "surfaceColor" TEXT NOT NULL DEFAULT '#1B1916',
    "textColor" TEXT NOT NULL DEFAULT '#F5EFE0',
    "mutedTextColor" TEXT NOT NULL DEFAULT '#B8B0A0',
    "borderColor" TEXT NOT NULL DEFAULT '#2B2823',
    "headingFont" TEXT NOT NULL DEFAULT 'Cormorant Garamond',
    "bodyFont" TEXT NOT NULL DEFAULT 'DM Sans',
    "cardRadius" INTEGER NOT NULL DEFAULT 18,
    "buttonRadius" INTEGER NOT NULL DEFAULT 14,
    "cardStyle" TEXT NOT NULL DEFAULT 'solid',
    "categoryCardStyle" TEXT NOT NULL DEFAULT 'image-overlay',
    "productCardStyle" TEXT NOT NULL DEFAULT 'horizontal',
    "headerStyle" TEXT NOT NULL DEFAULT 'centered',
    "animationLevel" TEXT NOT NULL DEFAULT 'normal',
    "introAnimation" TEXT NOT NULL DEFAULT 'fade',
    "customCssVariables" JSONB,
    "themeVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThemeSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThemeSettings_businessId_key" ON "ThemeSettings"("businessId");

DO $$ BEGIN
  ALTER TABLE "ThemeSettings" ADD CONSTRAINT "ThemeSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Category: image / description / icon / active + slug (backfilled from name)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- Derive slug from name (Turkish-aware transliteration, mirrors src/lib/utils slugify)
UPDATE "Category"
SET "slug" = TRIM(BOTH '-' FROM LOWER(
  REGEXP_REPLACE(
    TRANSLATE("name", 'çÇğĞıIİöÖşŞüÜ', 'ccggiiioossuu'),
    '[^a-z0-9]+',
    '-',
    'g'
  )
))
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "Category"
SET "slug" = 'kategori-' || SUBSTRING(REPLACE("id", '-', ''), 1, 8)
WHERE "slug" IS NULL OR "slug" = '';

-- Resolve collisions within the same business (keep first, suffix others)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "businessId", "slug"
      ORDER BY "sortOrder" ASC, id ASC
    ) AS rn
  FROM "Category"
)
UPDATE "Category" AS c
SET "slug" = c."slug" || '-' || r.rn
FROM ranked AS r
WHERE c.id = r.id AND r.rn > 1;

ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Category_businessId_slug_key"
  ON "Category"("businessId", "slug");

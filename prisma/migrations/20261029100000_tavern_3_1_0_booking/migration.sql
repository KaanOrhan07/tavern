-- Tavern 3.1.0 — randevu sistemi görselleri ve galeri

ALTER TABLE "Service"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "description" TEXT;

ALTER TABLE "User"
  ADD COLUMN "imageUrl" TEXT;

ALTER TABLE "BusinessInfo"
  ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

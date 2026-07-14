-- İşletme profil görselleri (logo, banner)
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;

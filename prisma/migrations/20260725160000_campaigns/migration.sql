-- CreateEnum
CREATE TYPE "CampaignDisplayType" AS ENUM ('BANNER', 'POPUP');
CREATE TYPE "CampaignTargetType" AS ENUM ('NONE', 'PRODUCT', 'CATEGORY');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayType" "CampaignDisplayType" NOT NULL,
    "targetType" "CampaignTargetType" NOT NULL DEFAULT 'NONE',
    "targetProductId" TEXT,
    "targetCategoryId" TEXT,
    "imageUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "displayFrequency" TEXT NOT NULL DEFAULT 'once_per_session',
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startTime" TEXT,
    "endTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTranslation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "buttonText" TEXT,

    CONSTRAINT "CampaignTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_businessId_active_startsAt_endsAt_idx" ON "Campaign"("businessId", "active", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignTranslation_campaignId_locale_key" ON "CampaignTranslation"("campaignId", "locale");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_targetCategoryId_fkey" FOREIGN KEY ("targetCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTranslation" ADD CONSTRAINT "CampaignTranslation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

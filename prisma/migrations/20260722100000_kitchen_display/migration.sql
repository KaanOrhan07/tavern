-- AlterTable Business: adisyon tamamlanan kart temizleme süresi
ALTER TABLE "Business" ADD COLUMN "kitchenCompletedClearMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable OrderItem: mutfak hazırlandı işareti (teslimden bağımsız)
ALTER TABLE "OrderItem" ADD COLUMN "prepared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "preparedAt" TIMESTAMP(3);

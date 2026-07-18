-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_BILL';

-- AlterTable Product: diyet etiketleri
ALTER TABLE "Product" ADD COLUMN "vegan" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "vegetarian" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "glutenFree" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable OrderItem: müşteri notu
ALTER TABLE "OrderItem" ADD COLUMN "note" TEXT;

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'DARK';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CALL_WAITER';

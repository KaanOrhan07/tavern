-- Enum değerleri (ayrı transaction — PG kısıtı)
ALTER TYPE "OrderMode" ADD VALUE IF NOT EXISTS 'BOTH';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MEAL_CARD';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';

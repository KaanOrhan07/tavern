-- Enum değeri (ayrı transaction — PG kısıtı)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DUE';

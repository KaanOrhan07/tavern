-- Seed çalışmamış ortamlarda işletme türlerini ekle
INSERT INTO "BusinessType" ("id", "key", "name", "active", "createdAt")
SELECT 'cm_btype_restaurant', 'restaurant', 'Restoran / Kafe', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "BusinessType" WHERE "key" = 'restaurant');

INSERT INTO "BusinessType" ("id", "key", "name", "active", "createdAt")
SELECT 'cm_btype_barber', 'barber', 'Berber / Kuaför / Güzellik', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "BusinessType" WHERE "key" = 'barber');

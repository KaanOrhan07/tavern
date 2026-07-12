import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { FEATURES, type FeatureKey } from "@/lib/feature-defs";

export { FEATURES, type FeatureKey };

/** Özellik varsayılan olarak açıktır; sadece açıkça kapatılmışsa false döner. */
export async function isFeatureEnabled(businessId: string, key: FeatureKey) {
  const row = await prisma.businessFeature.findUnique({
    where: { businessId_featureKey: { businessId, featureKey: key } },
  });
  return row ? row.enabled : true;
}

/**
 * Bir işletmenin tüm özellik durumlarını map olarak döndürür.
 * React `cache()` ile sarılı: aynı istek içinde (layout + page) birden
 * fazla çağrılsa da veritabanına sadece bir kez gider.
 */
export const getFeatureMap = cache(async (businessId: string) => {
  const rows = await prisma.businessFeature.findMany({ where: { businessId } });
  const map = new Map(rows.map((r) => [r.featureKey, r.enabled]));
  const result: Record<string, boolean> = {};
  for (const f of FEATURES) result[f.key] = map.get(f.key) ?? true;
  return result as Record<FeatureKey, boolean>;
});

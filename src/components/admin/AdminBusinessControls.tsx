"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Toggle } from "@/components/ui";
import { FEATURES, type FeatureKey } from "@/lib/feature-defs";

export function AdminBusinessControls({
  businessId,
  active,
  featureMap,
}: {
  businessId: string;
  active: boolean;
  featureMap: Record<FeatureKey, boolean>;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(active);
  const [features, setFeatures] = useState(featureMap);
  const [busy, setBusy] = useState(false);

  async function toggleActive(value: boolean) {
    setBusy(true);
    setIsActive(value);
    const res = await fetch(`/api/admin/businesses/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: value }),
    });
    if (!res.ok) setIsActive(!value);
    setBusy(false);
    router.refresh();
  }

  async function toggleFeature(featureKey: FeatureKey, enabled: boolean) {
    setFeatures((prev) => ({ ...prev, [featureKey]: enabled }));
    const res = await fetch(`/api/admin/businesses/${businessId}/features`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey, enabled }),
    });
    if (!res.ok) setFeatures((prev) => ({ ...prev, [featureKey]: !enabled }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">İşletme Durumu</p>
            <p className="mt-0.5 text-xs text-cream-dim">
              Pasif yapılırsa hem işletme paneli hem müşteri QR sayfaları erişilemez olur.
            </p>
          </div>
          <Toggle checked={isActive} onChange={toggleActive} disabled={busy} />
        </div>
      </Card>

      <Card>
        <p className="mb-4 font-medium">Özellik Bayrakları</p>
        <div className="divide-y divide-ink-line">
          {FEATURES.map((f) => (
            <div key={f.key} className="flex items-center justify-between py-3">
              <p className="text-sm">{f.name}</p>
              <Toggle
                checked={features[f.key]}
                onChange={(v) => toggleFeature(f.key, v)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

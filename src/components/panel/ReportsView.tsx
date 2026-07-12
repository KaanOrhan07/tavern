"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";

const PERIODS = [
  { key: "day", label: "Günlük" },
  { key: "week", label: "Haftalık" },
  { key: "month", label: "Aylık" },
  { key: "quarter", label: "3 Aylık" },
];

type BestSeller = { productName: string; quantity: number };
type Forecast = {
  summary: string;
  productForecasts: { productName: string; expectedDailySales: number; note: string }[];
  stockWarnings: { ingredientName: string; warning: string }[];
};

export function ReportsView({
  bestSellersEnabled,
  forecastEnabled,
}: {
  bestSellersEnabled: boolean;
  forecastEnabled: boolean;
}) {
  const [period, setPeriod] = useState("week");
  const [bestSellers, setBestSellers] = useState<BestSeller[] | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBestSellers = useCallback(async () => {
    if (!bestSellersEnabled) return;
    const res = await fetch(`/api/panel/reports/best-sellers?period=${period}`);
    if (res.ok) {
      const data = await res.json();
      setBestSellers(data.products);
    }
  }, [period, bestSellersEnabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState fetch sonrası çalışır
    loadBestSellers();
  }, [loadBestSellers]);

  async function runForecast() {
    setForecastLoading(true);
    setError(null);
    const res = await fetch("/api/ai/forecast", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      setForecast(data);
    } else {
      setError(data?.error ?? "Tahmin alınamadı");
    }
    setForecastLoading(false);
  }

  if (!bestSellersEnabled && !forecastEnabled) {
    return (
      <EmptyState
        title="Rapor özellikleri kapalı"
        description="Bu özellikler yönetici tarafından kapatılmış."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Raporlar</h1>

      {bestSellersEnabled && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-medium">Çok Satanlar</h2>
            <div className="flex gap-1 rounded-xl bg-ink-soft p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    period === p.key ? "bg-gold text-ink" : "text-cream-dim"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {bestSellers === null ? (
            <p className="text-sm text-cream-dim">Yükleniyor...</p>
          ) : bestSellers.length === 0 ? (
            <EmptyState title="Bu dönemde satış yok" />
          ) : (
            <Card className="p-0">
              <div className="divide-y divide-ink-line">
                {bestSellers.map((item, index) => (
                  <div key={item.productName} className="flex items-center gap-3 p-4">
                    <span className="w-8 text-center font-semibold text-gold">
                      {index + 1}
                    </span>
                    <p className="flex-1 font-medium">{item.productName}</p>
                    <p className="text-sm text-cream-dim">{item.quantity} adet</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      )}

      {forecastEnabled && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">AI Satış Tahmini & Stok Önerisi</h2>
            <Button variant="secondary" onClick={runForecast} disabled={forecastLoading}>
              {forecastLoading ? "Analiz ediliyor..." : "Tahmin Oluştur"}
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {forecast && (
            <div className="space-y-3">
              <Card>
                <p className="text-sm leading-relaxed">{forecast.summary}</p>
              </Card>
              {forecast.productForecasts.length > 0 && (
                <Card className="p-0">
                  <p className="border-b border-ink-line p-4 text-sm font-medium">
                    Ürün Bazlı Tahmin
                  </p>
                  <div className="divide-y divide-ink-line">
                    {forecast.productForecasts.map((f) => (
                      <div key={f.productName} className="p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{f.productName}</p>
                          <p className="text-sm text-gold">
                            ~{f.expectedDailySales} adet/gün
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-cream-dim">{f.note}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {forecast.stockWarnings.length > 0 && (
                <Card className="p-0">
                  <p className="border-b border-ink-line p-4 text-sm font-medium text-warn">
                    Stok Uyarıları
                  </p>
                  <div className="divide-y divide-ink-line">
                    {forecast.stockWarnings.map((w) => (
                      <div key={w.ingredientName} className="p-4">
                        <p className="font-medium">{w.ingredientName}</p>
                        <p className="mt-1 text-xs text-cream-dim">{w.warning}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

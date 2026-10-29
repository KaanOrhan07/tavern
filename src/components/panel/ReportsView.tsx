"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, PageHeader, Segmented, StatCard } from "@/components/ui";
import {
  AreaChart,
  BarChart,
  ChartSkeleton,
  Delta,
  DonutChart,
  Heatmap,
  RankBars,
  fmtMoney,
} from "@/components/charts/charts";
import type { ReportsOverview } from "@/lib/reports-overview";

const RANGES = [
  { value: 7, label: "7 gün" },
  { value: 30, label: "30 gün" },
  { value: 90, label: "90 gün" },
];

const kurusMoney = (kurus: number) => fmtMoney(kurus / 100);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const WD = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

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
  const [days, setDays] = useState(7);
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [topMode, setTopMode] = useState<"qty" | "revenue">("qty");
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(null);
    const res = await fetch(`/api/panel/reports/overview?days=${days}`);
    if (res.ok) setData(await res.json());
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState fetch sonrası çalışır
    void load();
  }, [load]);

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

  const exportHref = data
    ? `/api/panel/reports/export?from=${encodeURIComponent(data.daily[0].date + "T00:00:00+03:00")}&to=${encodeURIComponent(new Date(Date.parse(data.daily[data.daily.length - 1].date + "T00:00:00+03:00") + 86400000).toISOString())}`
    : "#";
  const top = data ? (topMode === "qty" ? data.topByQty : data.topByRevenue) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        subtitle="Ciro, saatler, ödeme türleri ve ürün performansı"
        actions={
          <>
            <Segmented label="Dönem" value={days} onChange={setDays} options={RANGES} />
            <a
              href={exportHref}
              className="inline-flex min-h-9 items-center rounded-lg border border-ink-line px-3 text-xs text-cream-dim hover:border-gold hover:text-cream"
            >
              CSV indir
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ciro"
          value={data ? kurusMoney(data.revenueKurus) : "…"}
          hint={data && <Delta current={data.revenueKurus} previous={data.prevRevenueKurus} />}
        />
        <StatCard
          label="Ödeme sayısı"
          value={data ? data.paymentCount : "…"}
          hint={data && <Delta current={data.paymentCount} previous={data.prevPaymentCount} />}
        />
        <StatCard
          label="Ortalama hesap"
          value={data ? kurusMoney(data.avgTicketKurus) : "…"}
          hint={data && <Delta current={data.avgTicketKurus} previous={data.prevAvgTicketKurus} />}
        />
        <StatCard label="Satılan ürün" value={data ? data.itemCount : "…"} hint="adet" />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-medium">Günlük ciro</h2>
        {data ? (
          <AreaChart
            title={`Son ${days} günün günlük cirosu`}
            valueLabel="Ciro"
            points={data.daily.map((d) => ({ label: d.label, value: d.revenueKurus / 100 }))}
          />
        ) : (
          <ChartSkeleton />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-medium">Haftanın günlerine göre ciro</h2>
          {data ? (
            <BarChart
              title="Haftanın günlerine göre ciro"
              format={fmtMoney}
              valueLabel="Ciro"
              points={data.weekday.map((w) => ({ label: w.label, value: w.revenueKurus / 100 }))}
            />
          ) : (
            <ChartSkeleton height={200} />
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Saatlere göre yoğunluk</h2>
          {data ? (
            <BarChart
              title="Saatlere göre ödeme sayısı"
              valueLabel="Ödeme"
              color="var(--chart-3)"
              points={data.hourly.map((v, h) => ({ label: HOURS[h], value: v }))}
            />
          ) : (
            <ChartSkeleton height={200} />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-medium">Ödeme türleri</h2>
          {data ? (
            <DonutChart
              title="Ödeme türlerine göre ciro"
              slices={data.methods.map((m) => ({ label: m.label, value: m.amountKurus / 100 }))}
            />
          ) : (
            <ChartSkeleton height={160} />
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Yoğunluk haritası (gün × saat)</h2>
          {data ? <Heatmap rows={WD} cols={HOURS} values={data.weekdayHour} /> : <ChartSkeleton height={160} />}
        </Card>
      </div>

      {bestSellersEnabled && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium">En çok satan ürünler</h2>
            <Segmented
              label="Sıralama"
              value={topMode}
              onChange={setTopMode}
              options={[
                { value: "qty", label: "Adet" },
                { value: "revenue", label: "Ciro" },
              ]}
            />
          </div>
          {data ? (
            <RankBars
              items={top.map((t) => ({
                label: t.name,
                value: topMode === "qty" ? t.quantity : t.revenueKurus / 100,
                sub: topMode === "qty" ? "adet" : undefined,
              }))}
              format={topMode === "qty" ? (n) => String(Math.round(n)) : fmtMoney}
            />
          ) : (
            <ChartSkeleton height={200} />
          )}
        </Card>
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

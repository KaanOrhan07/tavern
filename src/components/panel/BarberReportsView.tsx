"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PageHeader, Segmented, StatCard } from "@/components/ui";
import {
  AreaChart,
  BarChart,
  ChartSkeleton,
  Delta,
  Heatmap,
  RankBars,
  fmtMoney,
  fmtNum,
} from "@/components/charts/charts";
import type { BarberReports } from "@/lib/reports-barber";

const RANGES = [
  { value: 7, label: "7 gün" },
  { value: 30, label: "30 gün" },
  { value: 90, label: "90 gün" },
];

const kurusMoney = (kurus: number) => fmtMoney(kurus / 100);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const WD = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function BarberReportsView() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<BarberReports | null>(null);
  const [topMode, setTopMode] = useState<"revenue" | "count">("revenue");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(null);
    setError(null);
    const res = await fetch(`/api/panel/reports/barber?days=${days}`);
    if (res.ok) setData(await res.json());
    else setError("Rapor yüklenemedi");
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState fetch sonrası çalışır
    void load();
  }, [load]);

  // Yoğun saatler: yalnızca veri olan saat aralığını göster
  const busyHours = useMemo(() => {
    if (!data) return [];
    const first = data.hourly.findIndex((v) => v > 0);
    let last = -1;
    data.hourly.forEach((v, i) => {
      if (v > 0) last = i;
    });
    if (first === -1) return [];
    return data.hourly
      .slice(first, last + 1)
      .map((value, i) => ({ label: HOURS[first + i], value }));
  }, [data]);

  const exportHref = useMemo(() => {
    if (!data) return null;
    const rows = [
      ["Tarih", "Randevu", "Ciro (TL)"],
      ...data.daily.map((d) => [d.date, String(d.count), (d.revenueKurus / 100).toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    return `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + csv)}`;
  }, [data]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Raporlar"
        subtitle="Randevu cirosu, doluluk ve personel performansı."
        actions={
          <Segmented
            label="Dönem"
            value={days}
            onChange={setDays}
            options={RANGES}
          />
        }
      />

      {error && <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ciro"
          value={data ? kurusMoney(data.revenueKurus) : "…"}
          hint={data && <Delta current={data.revenueKurus} previous={data.prevRevenueKurus} />}
        />
        <StatCard
          label="Tamamlanan"
          value={data ? fmtNum(data.completedCount) : "…"}
          hint={data && <Delta current={data.completedCount} previous={data.prevCompletedCount} />}
        />
        <StatCard
          label="Ort. işlem"
          value={data ? kurusMoney(data.avgTicketKurus) : "…"}
          hint={data && <Delta current={data.avgTicketKurus} previous={data.prevAvgTicketKurus} />}
        />
        <StatCard
          label="Gelmedi oranı"
          value={data ? `%${Math.round(data.noShowRate * 100)}` : "…"}
          hint={data ? `${data.noShowCount} gelmedi · ${data.cancelledCount} iptal` : undefined}
          tone={data && data.noShowRate >= 0.15 ? "warn" : "default"}
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Günlük ciro</h2>
          {exportHref && (
            <a href={exportHref} download={`berber-rapor-${days}gun.csv`} className="text-xs text-gold hover:underline">
              CSV indir
            </a>
          )}
        </div>
        {data ? (
          <AreaChart title="Günlük ciro" valueLabel="Ciro" points={data.daily.map((d) => ({ label: d.label, value: d.revenueKurus / 100 }))} />
        ) : (
          <ChartSkeleton />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-medium">Günlük randevu sayısı</h2>
          {data ? (
            <BarChart title="Günlük randevu" valueLabel="Randevu" points={data.daily.map((d) => ({ label: d.label, value: d.count }))} />
          ) : (
            <ChartSkeleton height={200} />
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Yoğun saatler</h2>
          {data ? (
            <BarChart title="Yoğun saatler" valueLabel="Randevu" points={busyHours} emptyText="Tamamlanan randevu yok" />
          ) : (
            <ChartSkeleton height={200} />
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-medium">Gün × saat yoğunluğu</h2>
        {data ? (
          <Heatmap rows={WD} cols={HOURS} values={data.weekdayHour} emptyText="Tamamlanan randevu yok" />
        ) : (
          <ChartSkeleton height={160} />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Hizmetler</h2>
            <Segmented
              label="Sırala"
              value={topMode}
              onChange={setTopMode}
              options={[
                { value: "revenue", label: "Ciro" },
                { value: "count", label: "Adet" },
              ]}
            />
          </div>
          {data ? (
            <RankBars
              items={[...data.byService]
                .sort((a, b) => (topMode === "revenue" ? b.revenueKurus - a.revenueKurus : b.count - a.count))
                .map((s) => ({
                  label: s.name,
                  value: topMode === "revenue" ? s.revenueKurus / 100 : s.count,
                }))}
              format={topMode === "revenue" ? fmtMoney : fmtNum}
            />
          ) : (
            <ChartSkeleton height={160} />
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Personel performansı</h2>
          {data ? (
            <RankBars
              items={[...data.byStaff]
                .sort((a, b) => (topMode === "revenue" ? b.revenueKurus - a.revenueKurus : b.count - a.count))
                .map((s) => ({
                  label: s.name,
                  value: topMode === "revenue" ? s.revenueKurus / 100 : s.count,
                }))}
              format={topMode === "revenue" ? fmtMoney : fmtNum}
            />
          ) : (
            <ChartSkeleton height={160} />
          )}
        </Card>
      </div>
    </div>
  );
}

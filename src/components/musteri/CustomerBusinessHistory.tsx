"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type HistoryItem = {
  id: string;
  kind: "order" | "appointment";
  at: string;
  title: string;
  amountLabel: string | null;
  status: string;
};

type Payload = {
  business: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isBarber: boolean;
  };
  stats: {
    totalVisits: number;
    totalOrders: number;
    totalAppointments: number;
    totalSpentKurus: number;
    lastVisitAt: string;
  } | null;
  loyalty: { points: number; tierName: string | null };
  history: HistoryItem[];
};

const STATUS_TR: Record<string, string> = {
  OPEN: "Açık",
  CLOSED: "Ödendi",
  PENDING_BUSINESS_APPROVAL: "Onay bekliyor",
  APPROVED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  CANCELLED_BY_CUSTOMER: "İptal",
  CANCELLED_BY_BUSINESS: "İptal",
  NO_SHOW: "Gelmedi",
  EXPIRED: "Süresi doldu",
  REJECTED: "Red",
  BOOKED: "Onaylandı",
};

export function CustomerBusinessHistory({ slug }: { slug: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/customer/business/${encodeURIComponent(slug)}`);
    if (res.status === 401) {
      router.replace("/panel/giris-yap");
      return;
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Yüklenemedi");
      return;
    }
    setData(json);
  }, [slug, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, [load]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-cream-dim">Yükleniyor...</p>;

  const { business, stats, loyalty, history } = data;

  return (
    <div className="space-y-6">
      <Link href="/panel/hesabim" className="text-sm text-gold hover:underline">
        ← Hesabım
      </Link>

      <div className="flex items-center gap-3">
        {business.logoUrl ? (
          <span className="relative h-14 w-14 overflow-hidden rounded-2xl">
            <Image
              src={business.logoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
              unoptimized={business.logoUrl.startsWith("/api/")}
            />
          </span>
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-xl font-semibold text-gold">
            {business.name.slice(0, 1)}
          </span>
        )}
        <div>
          <h1 className="text-xl font-semibold">{business.name}</h1>
          <p className="text-sm text-cream-dim">
            {loyalty.points} puan
            {loyalty.tierName ? ` · ${loyalty.tierName}` : ""}
            {stats ? ` · ${stats.totalVisits} ziyaret` : ""}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Card className="p-3">
            <p className="font-semibold text-gold">{stats.totalOrders}</p>
            <p className="text-cream-dim">Sipariş</p>
          </Card>
          <Card className="p-3">
            <p className="font-semibold text-gold">{stats.totalAppointments}</p>
            <p className="text-cream-dim">Randevu</p>
          </Card>
          <Card className="p-3">
            <p className="font-semibold text-gold">{formatKurus(stats.totalSpentKurus)}</p>
            <p className="text-cream-dim">Harcama</p>
          </Card>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          href={business.isBarber ? `/${business.slug}/randevu` : `/${business.slug}`}
          className="flex-1 rounded-xl bg-gold py-3 text-center text-sm font-semibold text-ink"
        >
          {business.isBarber ? "Randevu al" : "Menüye git"}
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-cream-dim">Geçmiş</h2>
        {history.length === 0 ? (
          <EmptyState title="Geçmiş yok" description="Bu işletmede henüz kayıtlı işlem yok." />
        ) : (
          history.map((h) => (
            <Card key={`${h.kind}-${h.id}`} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{h.title}</p>
                  <p className="mt-0.5 text-xs text-cream-dim">
                    {new Date(h.at).toLocaleString("tr-TR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {" · "}
                    {h.kind === "order" ? "Sipariş" : "Randevu"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone="neutral">{STATUS_TR[h.status] ?? h.status}</Badge>
                  {h.amountLabel && (
                    <p className="mt-1 text-xs font-medium text-gold">{h.amountLabel}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

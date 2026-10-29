"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Star, X } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import { DEFAULT_BUSINESS_TZ } from "@/lib/business-timezone";

type HistoryItem = {
  id: string;
  kind: "order" | "appointment";
  at: string;
  title: string;
  amountLabel: string | null;
  status: string;
  cancelToken?: string;
  proposedStartAt?: string | null;
};

type Payload = {
  business: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isBarber: boolean;
    googleReviewUrl: string | null;
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
  RESCHEDULE_PROPOSED: "Yeni saat önerildi",
  RESCHEDULE_ACCEPTED: "Onaylandı",
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

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

  async function respond(h: HistoryItem, action: "accept_reschedule" | "reject_reschedule") {
    if (!h.cancelToken) return;
    setBusyId(h.id);
    setError(null);
    const res = await fetch("/api/public/appointments/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelToken: h.cancelToken, action }),
    });
    if (res.ok) await load();
    else setError((await res.json().catch(() => null))?.error ?? "İşlem başarısız");
    setBusyId(null);
  }

  async function cancelAppointment(h: HistoryItem) {
    if (!h.cancelToken) return;
    if (!confirm("Randevu iptal edilsin mi?")) return;
    setBusyId(h.id);
    setError(null);
    const res = await fetch("/api/public/appointments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelToken: h.cancelToken }),
    });
    if (res.ok) await load();
    else setError((await res.json().catch(() => null))?.error ?? "İptal edilemedi");
    setBusyId(null);
  }

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
          history.map((h) => {
            const future = new Date(h.at).getTime() > now;
            const cancellable =
              h.kind === "appointment" &&
              future &&
              ["PENDING_BUSINESS_APPROVAL", "APPROVED", "RESCHEDULE_ACCEPTED", "BOOKED"].includes(h.status);
            const showReview = h.kind === "appointment" && h.status === "COMPLETED" && business.googleReviewUrl;
            return (
              <Card key={`${h.kind}-${h.id}`} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{h.title}</p>
                    <p className="mt-0.5 text-xs text-cream-dim">
                      {new Date(h.at).toLocaleString("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: DEFAULT_BUSINESS_TZ,
                      })}
                      {" · "}
                      {h.kind === "order" ? "Sipariş" : "Randevu"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={h.status === "RESCHEDULE_PROPOSED" ? "gold" : "neutral"}>
                      {STATUS_TR[h.status] ?? h.status}
                    </Badge>
                    {h.amountLabel && <p className="mt-1 text-xs font-medium text-gold">{h.amountLabel}</p>}
                  </div>
                </div>

                {h.status === "RESCHEDULE_PROPOSED" && h.proposedStartAt && (
                  <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-cream-dim">
                      <CalendarClock className="h-4 w-4 text-gold" aria-hidden />
                      İşletme yeni saat önerdi:
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-gold">
                      {new Date(h.proposedStartAt).toLocaleString("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: DEFAULT_BUSINESS_TZ,
                      })}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button disabled={busyId === h.id} onClick={() => respond(h, "accept_reschedule")}>
                        Kabul et
                      </Button>
                      <Button variant="secondary" disabled={busyId === h.id} onClick={() => respond(h, "reject_reschedule")}>
                        Reddet
                      </Button>
                    </div>
                  </div>
                )}

                {showReview && (
                  <a
                    href={`/${business.slug}/yorum`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pressable mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/5 py-2.5 text-sm font-medium text-gold hover:bg-gold/10"
                  >
                    <Star className="h-4 w-4" aria-hidden />
                    Nasıldı? Google&apos;da değerlendir
                  </a>
                )}

                {cancellable && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" disabled={busyId === h.id} onClick={() => cancelAppointment(h)}>
                      <X className="h-4 w-4" aria-hidden /> İptal et
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}

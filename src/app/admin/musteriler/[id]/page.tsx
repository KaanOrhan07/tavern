"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type Detail = {
  customer: {
    id: string;
    phone: string;
    fullName: string | null;
    accountStatus: string;
    totalVisits: number;
    createdAt: string;
    lastLoginAt: string | null;
    businessCount: number;
    totalPoints: number;
  };
  businesses: {
    businessId: string;
    businessName: string;
    totalVisits: number;
    totalOrders: number;
    totalAppointments: number;
    totalSpentKurus: number;
    lastVisitAt: string;
    points: number;
    tierName: string | null;
  }[];
  history: {
    id: string;
    kind: string;
    at: string;
    businessName: string;
    title: string;
    amountLabel: string;
    status: string;
  }[];
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPin, setTempPin] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/customers/${params.id}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Yüklenemedi");
      return;
    }
    setData(json);
  }, [params.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, [load]);

  async function resetPin() {
    setTempPin(null);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: params.id }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) setTempPin(json.temporaryPin);
    else setError(json?.error ?? "Sıfırlama başarısız");
  }

  if (error && !data) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-cream-dim">Yükleniyor...</p>;

  const { customer, businesses, history } = data;

  return (
    <div className="space-y-6">
      <Link href="/admin/musteriler" className="text-sm text-gold hover:underline">
        ← Müşteriler
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{customer.fullName || "İsimsiz"}</h1>
          <p className="text-sm text-cream-dim">{customer.phone}</p>
          <p className="mt-1 text-xs text-cream-dim">
            {customer.businessCount} işletme · {customer.totalPoints} puan ·{" "}
            {customer.totalVisits} ziyaret
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={customer.accountStatus === "active" ? "ok" : "warn"}>
            {customer.accountStatus}
          </Badge>
          <Button type="button" variant="ghost" onClick={resetPin}>
            PIN sıfırla
          </Button>
        </div>
      </div>

      {tempPin && (
        <Card className="border-gold/40 p-4">
          <p className="text-sm text-cream-dim">Geçici PIN (bir kez)</p>
          <p className="mt-1 text-2xl font-semibold tracking-widest text-gold">{tempPin}</p>
        </Card>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-cream-dim">İşletme dökümü</h2>
        {businesses.length === 0 ? (
          <EmptyState title="İşletme yok" />
        ) : (
          businesses.map((b) => (
            <Card key={b.businessId} className="flex flex-wrap justify-between gap-2 p-4">
              <div>
                <p className="font-medium">{b.businessName}</p>
                <p className="text-xs text-cream-dim">
                  {b.totalVisits} ziyaret · {b.totalOrders} sipariş · {b.totalAppointments}{" "}
                  randevu
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-gold">
                  {b.points} puan{b.tierName ? ` · ${b.tierName}` : ""}
                </p>
                <p className="text-cream-dim">{formatKurus(b.totalSpentKurus)}</p>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-cream-dim">Geçmiş (tüm işletmeler)</h2>
        {history.length === 0 ? (
          <EmptyState title="Geçmiş yok" />
        ) : (
          history.map((h) => (
            <Card key={`${h.kind}-${h.id}`} className="p-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{h.businessName}</p>
                  <p className="text-xs text-cream-dim">
                    {h.kind === "order" ? "Sipariş" : "Randevu"} · {h.title}
                  </p>
                  <p className="text-[11px] text-cream-dim">
                    {new Date(h.at).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <Badge tone="neutral">{h.status}</Badge>
                  <p className="mt-1 text-gold">{h.amountLabel}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

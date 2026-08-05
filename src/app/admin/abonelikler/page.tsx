"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Label } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  type: string;
  paymentDueDay: number | null;
  paymentStatus: string;
  lastPaymentDate: string | null;
  nextPaymentDate: string | null;
  monthlyFeeKurus: number | null;
};

function statusTone(s: string): "ok" | "warn" | "danger" | "neutral" {
  if (s === "overdue") return "danger";
  if (s === "pending") return "warn";
  return "ok";
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState("");
  const [payBusinessId, setPayBusinessId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/admin/subscriptions${params}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.businesses);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, [load]);

  async function setStatus(businessId: string, paymentStatus: string) {
    await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, paymentStatus }),
    });
    await load();
  }

  async function recordPayment() {
    if (!payBusinessId) return;
    const amountKurus = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountKurus) || amountKurus <= 0) {
      setMessage("Geçerli tutar girin");
      return;
    }
    const res = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: payBusinessId, amountKurus, method: "havale" }),
    });
    if (res.ok) {
      setMessage("Ödeme kaydedildi");
      setPayBusinessId(null);
      setAmount("");
      await load();
    } else {
      setMessage("Ödeme kaydı başarısız");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Abonelik / Ödeme</h1>
        <select
          className="rounded-lg border border-ink-line bg-ink-card px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Tümü</option>
          <option value="overdue">Gecikenler</option>
          <option value="pending">Bekleyenler</option>
          <option value="current">Güncel</option>
        </select>
      </div>
      {message && <p className="text-sm text-gold">{message}</p>}

      {rows === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Kayıt yok" description="Filtreye uyan işletme bulunamadı." />
      ) : (
        <div className="space-y-2">
          {rows.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm text-cream-dim">
                    {b.type} · ödeme günü {b.paymentDueDay ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-cream-dim">
                    Son:{" "}
                    {b.lastPaymentDate
                      ? new Date(b.lastPaymentDate).toLocaleDateString("tr-TR")
                      : "—"}
                    {" · "}
                    Aylık: {b.monthlyFeeKurus != null ? formatKurus(b.monthlyFeeKurus) : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(b.paymentStatus)}>{b.paymentStatus}</Badge>
                  <Button type="button" variant="ghost" onClick={() => setStatus(b.id, "overdue")}>
                    Gecikmiş
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setStatus(b.id, "current")}>
                    Güncel
                  </Button>
                  <Button type="button" onClick={() => setPayBusinessId(b.id)}>
                    Ödeme kaydet
                  </Button>
                </div>
              </div>
              {payBusinessId === b.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-line pt-3">
                  <div>
                    <Label>Tutar (₺)</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <Button type="button" onClick={recordPayment}>
                    Kaydet
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPayBusinessId(null)}>
                    Vazgeç
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

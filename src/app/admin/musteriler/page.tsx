"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";

type Customer = {
  id: string;
  phone: string;
  fullName: string | null;
  accountStatus: string;
  phoneVerified: boolean;
  totalVisits: number;
  createdAt: string;
  lastLoginAt: string | null;
  businesses: string[];
};

export default function AdminCustomersPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Customer[] | null>(null);
  const [tempPin, setTempPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.customers);
    }
  }, [q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, [load]);

  async function resetPin(id: string) {
    setError(null);
    setTempPin(null);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Sıfırlama başarısız");
      return;
    }
    setTempPin(data.temporaryPin);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Platform Müşterileri</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Ad veya telefon"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="button" onClick={load}>
            Ara
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {tempPin && (
        <Card className="border-gold/40 p-4">
          <p className="text-sm text-cream-dim">Geçici PIN (bir kez gösterilir)</p>
          <p className="mt-1 text-2xl font-semibold tracking-widest text-gold">{tempPin}</p>
        </Card>
      )}

      {items === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : items.length === 0 ? (
        <EmptyState title="Müşteri yok" description="Kayıtlı müşteri hesabı bulunamadı." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{c.fullName || "İsimsiz"}</p>
                <p className="text-sm text-cream-dim">{c.phone}</p>
                <p className="mt-1 text-xs text-cream-dim">
                  {c.businesses.length
                    ? c.businesses.join(", ")
                    : "Henüz işletme ilişkisi yok"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={c.accountStatus === "active" ? "ok" : "warn"}>
                  {c.accountStatus}
                </Badge>
                <Button type="button" variant="ghost" onClick={() => resetPin(c.id)}>
                  PIN sıfırla
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

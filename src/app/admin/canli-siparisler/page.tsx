"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Card, EmptyState, Input, Label } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type LiveOrder = {
  id: string;
  business: { id: string; name: string; slug: string };
  tableName: string;
  createdAt: string;
  totalKurus: number;
  paidKurus: number;
  itemStatuses: string[];
  itemCount: number;
};

export default function AdminLiveOrdersPage() {
  const [orders, setOrders] = useState<LiveOrder[] | null>(null);
  const [status, setStatus] = useState("");
  const [minKurus, setMinKurus] = useState("");
  const [maxKurus, setMaxKurus] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (minKurus) params.set("minKurus", String(Number(minKurus) * 100));
    if (maxKurus) params.set("maxKurus", String(Number(maxKurus) * 100));
    const res = await fetch(`/api/admin/live-orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
  }, [status, minKurus, maxKurus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Canlı Siparişler</h1>
      <p className="text-sm text-cream-dim">
        Tüm işletmelerin açık siparişleri (salt okunur).
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Kalem durumu</Label>
          <select
            className="w-full rounded-lg border border-ink-line bg-ink-card px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="PENDING">Alındı</option>
            <option value="PREPARING">Hazırlanıyor</option>
            <option value="READY">Hazır</option>
            <option value="DELIVERED">Teslim</option>
          </select>
        </div>
        <div>
          <Label>Min tutar (₺)</Label>
          <Input value={minKurus} onChange={(e) => setMinKurus(e.target.value)} />
        </div>
        <div>
          <Label>Max tutar (₺)</Label>
          <Input value={maxKurus} onChange={(e) => setMaxKurus(e.target.value)} />
        </div>
      </div>

      {orders === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : orders.length === 0 ? (
        <EmptyState title="Açık sipariş yok" description="Şu an platformda açık sipariş görünmüyor." />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{o.business.name}</p>
                  <p className="text-sm text-cream-dim">
                    Masa {o.tableName} · {o.itemCount} kalem
                  </p>
                  <p className="mt-1 text-xs text-cream-dim">
                    {new Date(o.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gold">{formatKurus(o.totalKurus)}</p>
                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                    {o.itemStatuses.map((s) => (
                      <Badge key={s} tone="neutral">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

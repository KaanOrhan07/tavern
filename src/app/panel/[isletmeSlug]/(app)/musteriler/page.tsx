"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type Customer = {
  id: string;
  phoneMasked: string;
  name: string | null;
  totalVisits: number;
  totalOrders: number;
  totalAppointments: number;
  totalSpendKurus: number;
  lastVisitAt: string | null;
  tierName: string | null;
  loyaltyPoints: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch("/api/panel/customers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCustomers(data?.customers ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Müşteriler</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Yalnızca bu işletmedeki ziyaret ve puanlar. Telefonlar maskelenir.
        </p>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title="Henüz müşteri yok"
          description="Hesaplı müşteriler sipariş/randevu tamamladıkça burada listelenir."
        />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-ink-line">
            {customers.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{c.name || "İsimsiz"}</p>
                    {c.tierName && <Badge tone="gold">{c.tierName}</Badge>}
                  </div>
                  <p className="text-xs text-cream-dim">{c.phoneMasked}</p>
                  <p className="mt-1 text-[11px] text-cream-dim">
                    {c.totalVisits} ziyaret · {c.totalOrders} sipariş · {c.totalAppointments}{" "}
                    randevu
                    {c.lastVisitAt
                      ? ` · son ${new Date(c.lastVisitAt).toLocaleDateString("tr-TR")}`
                      : ""}
                  </p>
                </div>
                <div className="text-end text-sm">
                  <p className="font-medium text-gold">{c.loyaltyPoints} puan</p>
                  <p className="text-cream-dim">{formatKurus(c.totalSpendKurus)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

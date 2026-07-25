"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type Customer = {
  id: string;
  phoneMasked: string;
  name: string | null;
  orderCount: number;
  totalSpendKurus: number;
  lastOrderAt: string | null;
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
          Telefon numaraları maskelenir. Resmi KVKK süreçleri için veri silme ayrı ele alınmalıdır.
        </p>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title="Henüz müşteri profili yok"
          description="Sadakat veya siparişlerle müşteri kayıtları oluştukça burada listelenir."
        />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-ink-line">
            {customers.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name || "İsimsiz"}</p>
                  <p className="text-xs text-cream-dim">{c.phoneMasked}</p>
                </div>
                <div className="text-end text-sm">
                  <p>{c.orderCount} sipariş</p>
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

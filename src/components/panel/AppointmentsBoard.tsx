"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type Appointment = {
  id: string;
  customerName: string;
  customerPhone: string;
  startAt: string;
  endAt: string;
  status: string;
  staff: { name: string };
  service: { name: string; durationMinutes: number; priceKurus: number };
};

export function AppointmentsBoard() {
  const [items, setItems] = useState<Appointment[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/panel/appointments");
    if (res.ok) {
      const data = await res.json();
      setItems(data.appointments);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  if (items === null) {
    return <p className="text-sm text-cream-dim">Yükleniyor...</p>;
  }

  if (items.length === 0) {
    return <EmptyState title="Bugün randevu yok" description="Yeni randevular burada görünür." />;
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <Card key={a.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{a.customerName}</p>
              <p className="text-sm text-cream-dim">{a.customerPhone}</p>
              <p className="mt-1 text-sm">
                {a.service.name} · {a.staff.name}
              </p>
              <p className="mt-1 text-sm text-gold">
                {new Date(a.startAt).toLocaleString("tr-TR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {" — "}
                {new Date(a.endAt).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right">
              <Badge tone={a.status === "BOOKED" ? "ok" : "neutral"}>
                {a.status === "BOOKED" ? "Aktif" : "Tamamlandı"}
              </Badge>
              <p className="mt-2 text-sm font-semibold text-gold">
                {formatKurus(a.service.priceKurus)}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

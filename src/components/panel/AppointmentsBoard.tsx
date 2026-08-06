"use client";

import { useCallback, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Label } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

type Appointment = {
  id: string;
  customerName: string;
  customerPhone: string;
  startAt: string;
  endAt: string;
  status: string;
  statusNote?: string | null;
  expiresAt?: string | null;
  proposedStartAt?: string | null;
  proposedEndAt?: string | null;
  staff: { name: string };
  service: { name: string; durationMinutes: number; priceKurus: number };
};

const LABELS: Record<string, string> = {
  PENDING_BUSINESS_APPROVAL: "Onay bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  RESCHEDULE_PROPOSED: "Alternatif saat",
  RESCHEDULE_ACCEPTED: "Yeni saat kabul",
  COMPLETED: "Tamamlandı",
  NO_SHOW: "Gelmedi",
  CANCELLED_BY_CUSTOMER: "Müşteri iptal",
  CANCELLED_BY_BUSINESS: "İşletme iptal",
  EXPIRED: "Süresi doldu",
  BOOKED: "Onaylandı",
};

function badgeTone(status: string): "ok" | "warn" | "danger" | "neutral" | "gold" {
  if (status === "PENDING_BUSINESS_APPROVAL") return "warn";
  if (status === "APPROVED" || status === "RESCHEDULE_ACCEPTED" || status === "BOOKED") return "ok";
  if (status === "RESCHEDULE_PROPOSED") return "gold";
  if (status === "COMPLETED") return "neutral";
  return "danger";
}

export function AppointmentsBoard() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [proposeStart, setProposeStart] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/panel/appointments");
    if (res.ok) {
      const data = await res.json();
      setItems(data.appointments);
    }
  }, []);

  useVisibleInterval(load, 25_000);

  async function act(
    id: string,
    action: string,
    extra?: { note?: string; proposedStartAt?: string; proposedEndAt?: string }
  ) {
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/panel/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "İşlem başarısız");
    } else {
      setRescheduleId(null);
      await load();
    }
    setBusyId(null);
  }

  async function submitReschedule(a: Appointment) {
    if (!proposeStart) {
      setError("Alternatif başlangıç saati seçin");
      return;
    }
    const start = new Date(proposeStart);
    const end = new Date(start.getTime() + a.service.durationMinutes * 60_000);
    await act(a.id, "propose_reschedule", {
      proposedStartAt: start.toISOString(),
      proposedEndAt: end.toISOString(),
      note: "İşletme alternatif saat önerdi",
    });
  }

  if (items === null) {
    return <p className="text-sm text-cream-dim">Yükleniyor...</p>;
  }

  if (items.length === 0) {
    return <EmptyState title="Bugün randevu yok" description="Yeni randevu talepleri burada görünür." />;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-danger">{error}</p>}
      {items.map((a) => {
        const pending = a.status === "PENDING_BUSINESS_APPROVAL";
        const active =
          a.status === "APPROVED" ||
          a.status === "RESCHEDULE_ACCEPTED" ||
          a.status === "BOOKED";
        return (
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
                {a.proposedStartAt && (
                  <p className="mt-1 text-xs text-cream-dim">
                    Öneri:{" "}
                    {new Date(a.proposedStartAt).toLocaleString("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
                {a.expiresAt && pending && (
                  <p className="mt-1 text-xs text-warn">
                    Yanıt süresi:{" "}
                    {new Date(a.expiresAt).toLocaleString("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge tone={badgeTone(a.status)}>{LABELS[a.status] ?? a.status}</Badge>
                <p className="mt-2 text-sm font-semibold text-gold">
                  {formatKurus(a.service.priceKurus)}
                </p>
              </div>
            </div>

            {(pending || active) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pending && (
                  <>
                    <Button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => act(a.id, "approve")}
                    >
                      Onayla
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busyId === a.id}
                      onClick={() => act(a.id, "reject", { note: "Uygun değil" })}
                    >
                      Reddet
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busyId === a.id}
                      onClick={() => {
                        setRescheduleId(a.id);
                        setProposeStart(a.startAt.slice(0, 16));
                      }}
                    >
                      Alternatif saat
                    </Button>
                  </>
                )}
                {active && (
                  <>
                    <Button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => act(a.id, "complete")}
                    >
                      Tamamlandı
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busyId === a.id}
                      onClick={() => act(a.id, "no_show")}
                    >
                      Gelmedi
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busyId === a.id}
                      onClick={() => act(a.id, "cancel", { note: "İşletme iptal" })}
                    >
                      İptal
                    </Button>
                  </>
                )}
              </div>
            )}

            {rescheduleId === a.id && (
              <div className="mt-3 grid gap-2 rounded-lg border border-ink-line p-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <Label>Alternatif başlangıç</Label>
                  <Input
                    type="datetime-local"
                    value={proposeStart}
                    onChange={(e) => setProposeStart(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="button" disabled={busyId === a.id} onClick={() => submitReschedule(a)}>
                    Gönder
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setRescheduleId(null)}>
                    Vazgeç
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

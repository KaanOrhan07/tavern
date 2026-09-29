"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Label } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { DEFAULT_BUSINESS_TZ, addDaysYmd, formatDateInTz, todayYmdInTz } from "@/lib/business-timezone";
import { WEEK_ORDER, weekdayOfYmd } from "@/lib/appointments-shared";

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
  staff: { id: string; name: string };
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

const CONFIRMED = ["APPROVED", "RESCHEDULE_ACCEPTED", "BOOKED"];
const WAITING = ["PENDING_BUSINESS_APPROVAL", "RESCHEDULE_PROPOSED"];
const STAFF_COLORS = ["#D4A857", "#6FA8DC", "#93C47D", "#E06666", "#B4A7D6", "#F6B26B", "#76A5AF"];

function badgeTone(status: string): "ok" | "warn" | "danger" | "neutral" | "gold" {
  if (status === "PENDING_BUSINESS_APPROVAL") return "warn";
  if (CONFIRMED.includes(status)) return "ok";
  if (status === "RESCHEDULE_PROPOSED") return "gold";
  if (status === "COMPLETED") return "neutral";
  return "danger";
}

const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: DEFAULT_BUSINESS_TZ });

function mondayOf(ymd: string) {
  const dow = weekdayOfYmd(ymd); // 0=Pazar
  return addDaysYmd(ymd, dow === 0 ? -6 : 1 - dow);
}

export function AppointmentsBoard() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [weekItems, setWeekItems] = useState<Appointment[]>([]);
  const [role, setRole] = useState<"owner" | "staff">("owner");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [proposeStart, setProposeStart] = useState("");
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayYmdInTz()));
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "week">("list");

  const load = useCallback(async () => {
    const res = await fetch(`/api/panel/appointments?week=${weekStart}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.appointments);
      setWeekItems(data.weekAppointments ?? []);
      setRole(data.role);
    }
  }, [weekStart]);

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

  const staffList = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of [...(items ?? []), ...weekItems]) map.set(a.staff.id, a.staff.name);
    return [...map].map(([id, name], i) => ({ id, name, color: STAFF_COLORS[i % STAFF_COLORS.length]! }));
  }, [items, weekItems]);
  const colorOf = (id: string) => staffList.find((s) => s.id === id)?.color ?? STAFF_COLORS[0]!;

  const groups = useMemo(() => {
    const today = todayYmdInTz();
    const list = (items ?? []).filter((a) => staffFilter === "all" || a.staff.id === staffFilter);
    return {
      waiting: list.filter((a) => WAITING.includes(a.status)),
      today: list.filter(
        (a) => formatDateInTz(new Date(a.startAt)) === today && !WAITING.includes(a.status)
      ),
      upcoming: list.filter(
        (a) => formatDateInTz(new Date(a.startAt)) > today && CONFIRMED.includes(a.status)
      ),
    };
  }, [items, staffFilter]);

  const weekDays = useMemo(() => {
    const filtered = weekItems.filter((a) => staffFilter === "all" || a.staff.id === staffFilter);
    return Array.from({ length: 7 }, (_, i) => {
      const ymd = addDaysYmd(weekStart, i);
      return {
        ymd,
        dow: WEEK_ORDER[i]!,
        list: filtered.filter((a) => formatDateInTz(new Date(a.startAt)) === ymd),
      };
    });
  }, [weekItems, weekStart, staffFilter]);

  if (items === null) {
    return <p className="text-sm text-cream-dim">Yükleniyor...</p>;
  }

  function renderCard(a: Appointment, muted = false) {
    const pending = a.status === "PENDING_BUSINESS_APPROVAL";
    const active = CONFIRMED.includes(a.status);
    return (
      <Card key={a.id} className={`p-4 ${muted ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{a.customerName}</p>
            <p className="text-sm text-cream-dim">{a.customerPhone}</p>
            <p className="mt-1 text-sm">
              {a.service.name} ·{" "}
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: colorOf(a.staff.id) }} />
                {a.staff.name}
              </span>
            </p>
            <p className="mt-1 text-sm text-gold">
              {new Date(a.startAt).toLocaleString("tr-TR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: DEFAULT_BUSINESS_TZ,
              })}
              {" — "}
              {hm(a.endAt)}
            </p>
            {a.proposedStartAt && (
              <p className="mt-1 text-xs text-cream-dim">
                Öneri:{" "}
                {new Date(a.proposedStartAt).toLocaleString("tr-TR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: DEFAULT_BUSINESS_TZ,
                })}
              </p>
            )}
            {a.expiresAt && pending && (
              <p className="mt-1 text-xs text-warn">
                Yanıt süresi:{" "}
                {new Date(a.expiresAt).toLocaleString("tr-TR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: DEFAULT_BUSINESS_TZ,
                })}
              </p>
            )}
          </div>
          <div className="text-right">
            <Badge tone={badgeTone(a.status)}>{LABELS[a.status] ?? a.status}</Badge>
            <p className="mt-2 text-sm font-semibold text-gold">{formatKurus(a.service.priceKurus)}</p>
          </div>
        </div>

        {(pending || active) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pending && (
              <>
                <Button type="button" disabled={busyId === a.id} onClick={() => act(a.id, "approve")}>
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
                <Button type="button" disabled={busyId === a.id} onClick={() => act(a.id, "complete")}>
                  Tamamlandı
                </Button>
                <Button type="button" variant="ghost" disabled={busyId === a.id} onClick={() => act(a.id, "no_show")}>
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
              <Input type="datetime-local" value={proposeStart} onChange={(e) => setProposeStart(e.target.value)} />
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
  }

  const weekLabel = `${new Date(weekStart + "T00:00:00Z").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })} – ${new Date(addDaysYmd(weekStart, 6) + "T00:00:00Z").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })}`;
  const todayYmd = todayYmdInTz();

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-ink-line p-1">
          {(["list", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm cursor-pointer ${
                view === v ? "bg-gold text-ink font-semibold" : "text-cream-dim hover:text-cream"
              }`}
            >
              {v === "list" ? "Liste" : "Haftalık Takvim"}
            </button>
          ))}
        </div>
        {role === "owner" && staffList.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStaffFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs cursor-pointer ${
                staffFilter === "all" ? "border-gold text-gold" : "border-ink-line text-cream-dim"
              }`}
            >
              Tüm personel
            </button>
            {staffList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStaffFilter(s.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer ${
                  staffFilter === s.id ? "border-gold text-gold" : "border-ink-line text-cream-dim"
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {role === "staff" && (
        <p className="text-xs text-cream-dim">Yalnızca size atanan randevular gösterilir.</p>
      )}

      {view === "week" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setWeekStart(addDaysYmd(weekStart, -7))}>
              ◀ Önceki Hafta
            </Button>
            <p className="text-sm font-medium">{weekLabel}</p>
            <Button variant="secondary" onClick={() => setWeekStart(addDaysYmd(weekStart, 7))}>
              Sonraki Hafta ▶
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-7">
            {weekDays.map((d) => (
              <div
                key={d.ymd}
                className={`rounded-xl border p-2 ${d.ymd === todayYmd ? "border-gold" : "border-ink-line"}`}
              >
                <p className="mb-2 text-xs font-semibold text-cream-dim">
                  {d.dow.short} · {Number(d.ymd.slice(8))}
                </p>
                {d.list.length === 0 ? (
                  <p className="text-[11px] text-cream-dim/60">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {d.list.map((a) => (
                      <div
                        key={a.id}
                        className={`rounded-lg border-l-4 bg-ink-card p-2 text-[11px] ${
                          WAITING.includes(a.status) ? "opacity-70" : ""
                        }`}
                        style={{ borderLeftColor: colorOf(a.staff.id) }}
                      >
                        <p className="font-semibold tabular-nums">{hm(a.startAt)}</p>
                        <p className="truncate">{a.customerName}</p>
                        <p className="truncate text-cream-dim">{a.service.name}</p>
                        {WAITING.includes(a.status) && <p className="text-warn">Onay bekliyor</p>}
                        {a.status === "COMPLETED" && <p className="text-cream-dim">Tamamlandı</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {view === "list" && (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-warn">Onay Bekleyenler ({groups.waiting.length})</h2>
            {groups.waiting.length === 0 ? (
              <p className="text-sm text-cream-dim">Onay bekleyen talep yok.</p>
            ) : (
              groups.waiting.map((a) => renderCard(a))
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gold">Bugünün Programı ({groups.today.length})</h2>
            {groups.today.length === 0 ? (
              <EmptyState title="Bugün randevu yok" description="Onaylanan bugünkü randevular burada saat sırasıyla görünür." />
            ) : (
              groups.today.map((a) => renderCard(a, a.status === "COMPLETED" || a.status === "NO_SHOW"))
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Yaklaşan Randevular ({groups.upcoming.length})</h2>
            {groups.upcoming.length === 0 ? (
              <p className="text-sm text-cream-dim">Yaklaşan onaylı randevu yok.</p>
            ) : (
              groups.upcoming.map((a) => renderCard(a))
            )}
          </section>
        </>
      )}
    </div>
  );
}

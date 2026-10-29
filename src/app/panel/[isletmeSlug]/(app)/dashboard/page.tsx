import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  CalendarClock,
  CircleDollarSign,
  LayoutGrid,
  Receipt,
  ShieldAlert,
  UtensilsCrossed,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { formatKurus, todayRange } from "@/lib/utils";
import { isBarberBusiness } from "@/lib/business-modules";
import { getReportsOverview } from "@/lib/reports-overview";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { AreaChart, BarChart, Delta, DonutChart, RankBars, Sparkline, fmtMoney } from "@/components/charts/charts";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("tr-TR", { hour: "numeric", hour12: false, timeZone: "Europe/Istanbul" }).format(new Date()));
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default async function DashboardPage({ params }: { params: Promise<{ isletmeSlug: string }> }) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    select: { name: true, type: { select: { key: true } } },
  });
  const barber = isBarberBusiness(business?.type.key ?? "");
  const base = `/panel/${isletmeSlug}`;

  return barber ? (
    <BarberDashboard businessId={session.businessId} base={base} name={business?.name ?? ""} />
  ) : (
    <RestaurantDashboard businessId={session.businessId} base={base} name={business?.name ?? ""} />
  );
}

async function RestaurantDashboard({ businessId, base, name }: { businessId: string; base: string; name: string }) {
  const { start, end } = todayRange();
  const [overview, openOrders, occupiedTables, totalTables, pendingRequests, productCount, aiPending, todayPay, yPay, openTables] =
    await Promise.all([
      getReportsOverview(businessId, 7),
      prisma.order.count({ where: { businessId, status: "OPEN" } }),
      prisma.table.count({ where: { businessId, orders: { some: { status: "OPEN" } } } }),
      prisma.table.count({ where: { businessId } }),
      prisma.staffRequest.count({ where: { businessId, status: "PENDING" } }),
      prisma.product.count({ where: { businessId, active: true } }),
      prisma.product.count({ where: { businessId, aiPending: true } }),
      prisma.payment.aggregate({ where: { businessId, createdAt: { gte: start, lt: end } }, _sum: { amountKurus: true } }),
      prisma.payment.aggregate({
        where: { businessId, createdAt: { gte: new Date(start.getTime() - 86400000), lt: start } },
        _sum: { amountKurus: true },
      }),
      prisma.table.findMany({
        where: { businessId, orders: { some: { status: "OPEN" } } },
        select: { id: true, name: true, orders: { where: { status: "OPEN" }, select: { items: { select: { quantity: true, unitKurus: true } } } } },
        take: 8,
      }),
    ]);

  const today = todayPay._sum.amountKurus ?? 0;
  const yesterday = yPay._sum.amountKurus ?? 0;
  const spark = overview.daily.map((d) => d.revenueKurus);
  const occupancy = totalTables ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const attention = [
    pendingRequests > 0 && { href: `${base}/talepler`, icon: BellRing, text: `${pendingRequests} bekleyen garson/hesap talebi`, tone: "warn" as const },
    aiPending > 0 && { href: `${base}/menu`, icon: ShieldAlert, text: `${aiPending} ürünün AI etiketi onay bekliyor`, tone: "warn" as const },
  ].filter(Boolean) as { href: string; icon: typeof BellRing; text: string; tone: "warn" }[];

  const quick = [
    { href: `${base}/masalar`, label: "Masalar", icon: LayoutGrid },
    { href: `${base}/adisyon`, label: "Adisyon", icon: Receipt },
    { href: `${base}/menu`, label: "Menü", icon: UtensilsCrossed },
    { href: `${base}/gun-sonu`, label: "Gün sonu", icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}!`} subtitle={`${name} · bugünün özeti`} />

      {attention.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {attention.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="pressable flex min-h-12 items-center gap-3 rounded-xl border border-warn/50 bg-warn/10 px-4 py-2.5 text-sm text-cream"
            >
              <a.icon className="h-5 w-5 shrink-0 text-warn" aria-hidden />
              <span className="flex-1">{a.text}</span>
              <span className="text-xs text-warn">Gör →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div style={{ ["--i" as string]: 0 }}>
          <StatCard
            label="Bugünkü ciro"
            href={`${base}/gun-sonu`}
            value={formatKurus(today)}
            hint={
              <span className="flex items-center gap-1.5">
                <Delta current={today} previous={yesterday} /> dünle kıyasla
              </span>
            }
          >
            <Sparkline values={spark} />
          </StatCard>
        </div>
        <div style={{ ["--i" as string]: 1 }}>
          <StatCard
            label="Dolu masa"
            href={`${base}/masalar`}
            value={`${occupiedTables} / ${totalTables}`}
            hint={`%${occupancy} doluluk`}
          >
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-soft" aria-hidden>
              <div className="h-full rounded-full bg-gold" style={{ width: `${occupancy}%` }} />
            </div>
          </StatCard>
        </div>
        <div style={{ ["--i" as string]: 2 }}>
          <StatCard label="Açık sipariş" href={`${base}/masalar`} value={openOrders} hint="ödeme bekleyen adisyon" />
        </div>
        <div style={{ ["--i" as string]: 3 }}>
          <StatCard
            label="Bekleyen talep"
            href={`${base}/talepler`}
            value={pendingRequests}
            tone={pendingRequests > 0 ? "warn" : "default"}
            hint={`${productCount} aktif ürün`}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Son 7 gün ciro</h2>
            <p className="tabular text-sm text-cream-dim">
              {formatKurus(overview.revenueKurus)} · <Delta current={overview.revenueKurus} previous={overview.prevRevenueKurus} />
            </p>
          </div>
          <AreaChart
            title="Son 7 günün günlük cirosu"
            valueLabel="Ciro"
            points={overview.daily.map((d) => ({ label: d.label, value: d.revenueKurus / 100 }))}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Ödeme türleri (7 gün)</h2>
          <DonutChart
            title="Ödeme türlerine göre ciro"
            slices={overview.methods.map((m) => ({ label: m.label, value: m.amountKurus / 100 }))}
            format={fmtMoney}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">En çok satanlar</h2>
            <Link href={`${base}/raporlar`} className="text-xs text-gold hover:underline">
              Tüm rapor →
            </Link>
          </div>
          <RankBars items={overview.topByQty.slice(0, 5).map((t) => ({ label: t.name, value: t.quantity, sub: "adet" }))} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Haftanın günleri</h2>
          <BarChart
            title="Haftanın günlerine göre ciro"
            height={190}
            format={fmtMoney}
            valueLabel="Ciro"
            points={overview.weekday.map((w) => ({ label: w.label, value: w.revenueKurus / 100 }))}
          />
        </Card>
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Şu an açık masalar</h2>
            <Link href={`${base}/masalar`} className="text-xs text-gold hover:underline">
              Masalar →
            </Link>
          </div>
          {openTables.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-line py-8 text-center text-sm text-cream-dim">Şu an açık masa yok</p>
          ) : (
            <ul className="space-y-1.5">
              {openTables.map((t) => {
                const total = t.orders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity * i.unitKurus, 0), 0);
                return (
                  <li key={t.id}>
                    <Link
                      href={`${base}/masalar`}
                      className="pressable flex min-h-11 items-center justify-between rounded-lg bg-ink-soft px-3 text-sm hover:bg-ink-line/40"
                    >
                      <span>{t.name}</span>
                      <span className="tabular font-medium text-gold">{formatKurus(total)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-cream-dim">Hızlı erişim</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quick.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="pressable flex min-h-14 items-center gap-3 rounded-xl border border-ink-line bg-ink-card px-4 text-sm hover:border-gold"
            >
              <q.icon className="h-5 w-5 text-gold" aria-hidden />
              {q.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

async function BarberDashboard({ businessId, base, name }: { businessId: string; base: string; name: string }) {
  const { start, end } = todayRange();
  const weekStart = new Date(start.getTime() - 6 * 86400000);
  const [pending, todayList, week, serviceCount] = await Promise.all([
    prisma.appointment.count({ where: { businessId, status: "PENDING_BUSINESS_APPROVAL" } }),
    prisma.appointment.findMany({
      where: { businessId, startAt: { gte: start, lt: end }, status: { in: ["APPROVED", "RESCHEDULE_ACCEPTED", "COMPLETED"] } },
      orderBy: { startAt: "asc" },
      select: { id: true, customerName: true, startAt: true, status: true, service: { select: { name: true, priceKurus: true } } },
    }),
    prisma.appointment.findMany({
      where: { businessId, startAt: { gte: weekStart, lt: end }, status: { in: ["APPROVED", "RESCHEDULE_ACCEPTED", "COMPLETED"] } },
      select: { startAt: true, service: { select: { priceKurus: true } } },
    }),
    prisma.service.count({ where: { businessId, active: true } }),
  ]);

  const byDay = new Map<string, { n: number; rev: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * 86400000);
    byDay.set(d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Istanbul" }), { n: 0, rev: 0 });
  }
  for (const a of week) {
    const k = a.startAt.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Istanbul" });
    const cur = byDay.get(k);
    if (cur) {
      cur.n += 1;
      cur.rev += a.service.priceKurus;
    }
  }
  const days = [...byDay.entries()];
  const todayRev = todayList.reduce((s, a) => s + a.service.priceKurus, 0);
  const time = (d: Date) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}!`} subtitle={`${name} · bugünün özeti`} />

      {pending > 0 && (
        <Link
          href={`${base}/randevular`}
          className="pressable flex min-h-12 items-center gap-3 rounded-xl border border-warn/50 bg-warn/10 px-4 py-2.5 text-sm"
        >
          <CalendarClock className="h-5 w-5 text-warn" aria-hidden />
          <span className="flex-1">{pending} randevu onayınızı bekliyor</span>
          <span className="text-xs text-warn">Gör →</span>
        </Link>
      )}

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div style={{ ["--i" as string]: 0 }}>
          <StatCard label="Bugünkü randevu" href={`${base}/randevular`} value={todayList.length} hint="onaylı" />
        </div>
        <div style={{ ["--i" as string]: 1 }}>
          <StatCard label="Tahmini ciro" value={formatKurus(todayRev)} hint="bugünün randevuları" />
        </div>
        <div style={{ ["--i" as string]: 2 }}>
          <StatCard label="Onay bekleyen" href={`${base}/randevular`} value={pending} tone={pending > 0 ? "warn" : "default"} />
        </div>
        <div style={{ ["--i" as string]: 3 }}>
          <StatCard label="Aktif hizmet" href={`${base}/hizmetler`} value={serviceCount} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium">Son 7 gün randevu sayısı</h2>
          <BarChart title="Son 7 günün randevu sayısı" valueLabel="Randevu" points={days.map(([label, v]) => ({ label, value: v.n }))} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Bugünkü program</h2>
          {todayList.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-line py-8 text-center text-sm text-cream-dim">Bugün randevu yok</p>
          ) : (
            <ul className="space-y-1.5">
              {todayList.map((a) => (
                <li key={a.id} className="flex min-h-11 items-center gap-3 rounded-lg bg-ink-soft px-3 text-sm">
                  <span className="tabular font-medium text-gold">{time(a.startAt)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {a.customerName}
                    <span className="block truncate text-xs text-cream-dim">{a.service.name}</span>
                  </span>
                  {a.status === "COMPLETED" && <span className="text-xs text-ok">tamam</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-medium">Son 7 gün tahmini gelir</h2>
        <AreaChart
          title="Son 7 günün tahmini geliri"
          valueLabel="Gelir"
          points={days.map(([label, v]) => ({ label, value: v.rev / 100 }))}
        />
      </Card>
    </div>
  );
}

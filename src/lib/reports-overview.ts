import { prisma } from "@/lib/prisma";

/**
 * 3.0 raporlar: grafikleri besleyen tek toplu sorgu (gün/saat/ödeme/ürün kırılımı + önceki dönem karşılaştırması).
 * Türkiye'de yaz saati yok → sabit UTC+3 ile günlere bölünür.
 */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const trDate = (d: Date) => new Date(d.getTime() + TR_OFFSET_MS);
const ymd = (d: Date) => trDate(d).toISOString().slice(0, 10);

export const METHOD_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CARD: "Kart",
  MEAL_CARD: "Yemek kartı",
  OTHER: "Diğer",
};

export type ReportsOverview = {
  days: number;
  revenueKurus: number;
  prevRevenueKurus: number;
  paymentCount: number;
  prevPaymentCount: number;
  avgTicketKurus: number;
  prevAvgTicketKurus: number;
  itemCount: number;
  daily: { date: string; label: string; revenueKurus: number }[];
  hourly: number[]; // 24 eleman: ödeme adedi
  weekdayHour: number[][]; // [pzt..paz][0..23] ödeme adedi
  weekday: { label: string; revenueKurus: number }[];
  methods: { method: string; label: string; amountKurus: number }[];
  topByQty: { name: string; quantity: number; revenueKurus: number }[];
  topByRevenue: { name: string; quantity: number; revenueKurus: number }[];
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export async function getReportsOverview(businessId: string, days: number): Promise<ReportsOverview> {
  const n = Math.min(Math.max(Math.round(days), 1), 90);
  const todayStart = new Date(`${ymd(new Date())}T00:00:00.000Z`).getTime() - TR_OFFSET_MS; // bugün 00:00 TR (UTC ms)
  const since = new Date(todayStart - (n - 1) * DAY_MS);
  const prevSince = new Date(since.getTime() - n * DAY_MS);

  const [payments, items] = await Promise.all([
    prisma.payment.findMany({
      where: { businessId, createdAt: { gte: prevSince } },
      select: { createdAt: true, method: true, amountKurus: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { businessId, status: { not: "CANCELLED" }, createdAt: { gte: since } } },
      select: { productName: true, quantity: true, unitKurus: true },
    }),
  ]);

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < n; i++) dailyMap.set(ymd(new Date(since.getTime() + i * DAY_MS)), 0);

  const hourly = Array<number>(24).fill(0);
  const weekdayHour = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const weekdayRev = Array<number>(7).fill(0);
  const methodMap = new Map<string, number>();

  let revenue = 0;
  let count = 0;
  let prevRevenue = 0;
  let prevCount = 0;

  for (const p of payments) {
    if (p.createdAt < since) {
      prevRevenue += p.amountKurus;
      prevCount += 1;
      continue;
    }
    revenue += p.amountKurus;
    count += 1;
    const t = trDate(p.createdAt);
    const key = t.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + p.amountKurus);
    const hour = t.getUTCHours();
    const wd = (t.getUTCDay() + 6) % 7; // Pzt=0
    hourly[hour] += 1;
    weekdayHour[wd][hour] += 1;
    weekdayRev[wd] += p.amountKurus;
    methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + p.amountKurus);
  }

  const prodMap = new Map<string, { quantity: number; revenueKurus: number }>();
  let itemCount = 0;
  for (const it of items) {
    itemCount += it.quantity;
    const cur = prodMap.get(it.productName) ?? { quantity: 0, revenueKurus: 0 };
    cur.quantity += it.quantity;
    cur.revenueKurus += it.quantity * it.unitKurus;
    prodMap.set(it.productName, cur);
  }
  const prods = [...prodMap.entries()].map(([name, v]) => ({ name, ...v }));

  const daily = [...dailyMap.entries()].map(([date, revenueKurus]) => ({
    date,
    label: `${date.slice(8, 10)}.${date.slice(5, 7)}`,
    revenueKurus,
  }));

  return {
    days: n,
    revenueKurus: revenue,
    prevRevenueKurus: prevRevenue,
    paymentCount: count,
    prevPaymentCount: prevCount,
    avgTicketKurus: count ? Math.round(revenue / count) : 0,
    prevAvgTicketKurus: prevCount ? Math.round(prevRevenue / prevCount) : 0,
    itemCount,
    daily,
    hourly,
    weekdayHour,
    weekday: WEEKDAYS.map((label, i) => ({ label, revenueKurus: weekdayRev[i] })),
    methods: [...methodMap.entries()]
      .map(([method, amountKurus]) => ({ method, label: METHOD_LABELS[method] ?? method, amountKurus }))
      .sort((a, b) => b.amountKurus - a.amountKurus),
    topByQty: [...prods].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    topByRevenue: [...prods].sort((a, b) => b.revenueKurus - a.revenueKurus).slice(0, 10),
  };
}

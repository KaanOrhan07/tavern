import { prisma } from "@/lib/prisma";

/**
 * 3.1.0 berber raporları: randevu verisinden grafikleri besleyen tek toplu sorgu.
 * Gelir = TAMAMLANAN randevuların hizmet fiyatı. Türkiye'de yaz saati yok → sabit UTC+3.
 */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const trDate = (d: Date) => new Date(d.getTime() + TR_OFFSET_MS);
const ymd = (d: Date) => trDate(d).toISOString().slice(0, 10);

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const CANCELLED = ["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_BUSINESS", "EXPIRED"];

export type BarberReports = {
  days: number;
  revenueKurus: number;
  prevRevenueKurus: number;
  completedCount: number;
  prevCompletedCount: number;
  noShowCount: number;
  cancelledCount: number;
  noShowRate: number; // 0..1
  avgTicketKurus: number;
  prevAvgTicketKurus: number;
  daily: { date: string; label: string; revenueKurus: number; count: number }[];
  hourly: number[]; // 24 eleman: tamamlanan randevu adedi
  weekdayHour: number[][]; // [pzt..paz][0..23]
  weekday: { label: string; revenueKurus: number }[];
  byService: { name: string; count: number; revenueKurus: number }[];
  byStaff: { name: string; count: number; revenueKurus: number }[];
};

export async function getBarberReports(businessId: string, days: number): Promise<BarberReports> {
  const n = Math.min(Math.max(Math.round(days), 1), 90);
  const todayStart = new Date(`${ymd(new Date())}T00:00:00.000Z`).getTime() - TR_OFFSET_MS;
  const since = new Date(todayStart - (n - 1) * DAY_MS);
  const prevSince = new Date(since.getTime() - n * DAY_MS);

  const appts = await prisma.appointment.findMany({
    where: { businessId, startAt: { gte: prevSince } },
    select: {
      startAt: true,
      status: true,
      staff: { select: { name: true } },
      service: { select: { name: true, priceKurus: true } },
    },
  });

  const dailyRev = new Map<string, number>();
  const dailyCnt = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const k = ymd(new Date(since.getTime() + i * DAY_MS));
    dailyRev.set(k, 0);
    dailyCnt.set(k, 0);
  }

  const hourly = Array<number>(24).fill(0);
  const weekdayHour = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const weekdayRev = Array<number>(7).fill(0);
  const serviceMap = new Map<string, { count: number; revenueKurus: number }>();
  const staffMap = new Map<string, { count: number; revenueKurus: number }>();

  let revenue = 0;
  let completed = 0;
  let prevRevenue = 0;
  let prevCompleted = 0;
  let noShow = 0;
  let cancelled = 0;

  for (const a of appts) {
    const price = a.service.priceKurus;
    const isCompleted = a.status === "COMPLETED";
    if (a.startAt < since) {
      if (isCompleted) {
        prevRevenue += price;
        prevCompleted += 1;
      }
      continue;
    }

    if (a.status === "NO_SHOW") noShow += 1;
    if (CANCELLED.includes(a.status)) cancelled += 1;
    if (!isCompleted) continue;

    revenue += price;
    completed += 1;
    const t = trDate(a.startAt);
    const key = t.toISOString().slice(0, 10);
    dailyRev.set(key, (dailyRev.get(key) ?? 0) + price);
    dailyCnt.set(key, (dailyCnt.get(key) ?? 0) + 1);
    const hour = t.getUTCHours();
    const wd = (t.getUTCDay() + 6) % 7;
    hourly[hour] += 1;
    weekdayHour[wd][hour] += 1;
    weekdayRev[wd] += price;

    const svc = serviceMap.get(a.service.name) ?? { count: 0, revenueKurus: 0 };
    svc.count += 1;
    svc.revenueKurus += price;
    serviceMap.set(a.service.name, svc);

    const stf = staffMap.get(a.staff.name) ?? { count: 0, revenueKurus: 0 };
    stf.count += 1;
    stf.revenueKurus += price;
    staffMap.set(a.staff.name, stf);
  }

  const daily = [...dailyRev.entries()].map(([date, revenueKurus]) => ({
    date,
    label: `${date.slice(8, 10)}.${date.slice(5, 7)}`,
    revenueKurus,
    count: dailyCnt.get(date) ?? 0,
  }));

  return {
    days: n,
    revenueKurus: revenue,
    prevRevenueKurus: prevRevenue,
    completedCount: completed,
    prevCompletedCount: prevCompleted,
    noShowCount: noShow,
    cancelledCount: cancelled,
    noShowRate: completed + noShow > 0 ? noShow / (completed + noShow) : 0,
    avgTicketKurus: completed ? Math.round(revenue / completed) : 0,
    prevAvgTicketKurus: prevCompleted ? Math.round(prevRevenue / prevCompleted) : 0,
    daily,
    hourly,
    weekdayHour,
    weekday: WEEKDAYS.map((label, i) => ({ label, revenueKurus: weekdayRev[i] })),
    byService: [...serviceMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenueKurus - a.revenueKurus)
      .slice(0, 10),
    byStaff: [...staffMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenueKurus - a.revenueKurus)
      .slice(0, 10),
  };
}

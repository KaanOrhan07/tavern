import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { todayRange } from "@/lib/utils";

// Gün sonu raporu: masa bazlı satış + günün toplam cirosu
export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { start, end } = todayRange();
  const payments = await prisma.payment.findMany({
    where: { businessId: ctx.business.id, createdAt: { gte: start, lt: end } },
    include: { order: { include: { table: { select: { name: true } } } } },
  });

  const byTable = new Map<string, { tableName: string; totalKurus: number; paymentCount: number }>();
  let totalKurus = 0;
  for (const p of payments) {
    totalKurus += p.amountKurus;
    const key = p.order.table.name;
    const entry = byTable.get(key) ?? { tableName: key, totalKurus: 0, paymentCount: 0 };
    entry.totalKurus += p.amountKurus;
    entry.paymentCount += 1;
    byTable.set(key, entry);
  }

  return NextResponse.json({
    date: start.toISOString(),
    totalKurus,
    paymentCount: payments.length,
    tables: [...byTable.values()].sort((a, b) => b.totalKurus - a.totalKurus),
  });
}

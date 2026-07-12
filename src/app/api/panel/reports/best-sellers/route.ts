import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isFeatureEnabled } from "@/lib/features";

const PERIODS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
};

// Çok satanlar: dönem filtresiyle en çok satılan ürünler
export async function GET(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  if (!(await isFeatureEnabled(ctx.business.id, "best_sellers"))) {
    return NextResponse.json({ error: "Bu özellik kapalı" }, { status: 403 });
  }

  const period = new URL(request.url).searchParams.get("period") ?? "week";
  const days = PERIODS[period] ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const items = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: {
      order: {
        businessId: ctx.business.id,
        status: { not: "CANCELLED" },
        createdAt: { gte: since },
      },
    },
    _sum: { quantity: true },
  });

  const products = items
    .map((i) => ({ productName: i.productName, quantity: i._sum.quantity ?? 0 }))
    .sort((a, b) => b.quantity - a.quantity);

  return NextResponse.json({ period, products });
}

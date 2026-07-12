import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isFeatureEnabled } from "@/lib/features";
import { forecastSales } from "@/lib/ai";

// Son 30 günün satışına göre AI satış tahmini + stok uyarısı
export async function POST() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  if (!(await isFeatureEnabled(ctx.business.id, "ai_forecast"))) {
    return NextResponse.json({ error: "Bu özellik kapalı" }, { status: 403 });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [items, ingredients] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        order: {
          businessId: ctx.business.id,
          status: { not: "CANCELLED" },
          createdAt: { gte: since },
        },
      },
      select: { productName: true, quantity: true, createdAt: true },
    }),
    prisma.ingredient.findMany({
      where: { businessId: ctx.business.id },
      select: { name: true, unit: true, quantity: true },
    }),
  ]);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Tahmin için yeterli satış verisi yok" },
      { status: 400 }
    );
  }

  // Gün + ürün bazında topla (AI'a kompakt veri gönder)
  const byDayProduct = new Map<string, number>();
  for (const item of items) {
    const key = `${item.createdAt.toISOString().slice(0, 10)}|${item.productName}`;
    byDayProduct.set(key, (byDayProduct.get(key) ?? 0) + item.quantity);
  }
  const history = [...byDayProduct.entries()].map(([key, quantity]) => {
    const [date, productName] = key.split("|");
    return { date, productName, quantity };
  });

  try {
    const result = await forecastSales(history, ingredients);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { error: "AI tahmini başarısız oldu, tekrar deneyin" },
      { status: 502 }
    );
  }
}

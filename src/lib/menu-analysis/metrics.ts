import { prisma } from "@/lib/prisma";

export type MenuMetricsSummary = {
  period: { from: string; to: string };
  currency: "TRY";
  summary: {
    orders: number;
    revenueKurus: number;
    averageBasketKurus: number;
  };
  products: {
    productId: string;
    name: string;
    unitsSold: number;
    revenueKurus: number;
  }[];
};

export async function computeMenuMetrics(
  businessId: string,
  days = 30
): Promise<MenuMetricsSummary> {
  const to = new Date();
  const from = new Date(Date.now() - days * 86_400_000);

  const orders = await prisma.order.findMany({
    where: {
      businessId,
      status: { in: ["CLOSED", "OPEN"] },
      createdAt: { gte: from, lte: to },
    },
    include: { items: true, payments: true },
  });

  const productMap = new Map<
    string,
    { productId: string; name: string; unitsSold: number; revenueKurus: number }
  >();

  let revenueKurus = 0;
  for (const order of orders) {
    revenueKurus += order.payments.reduce((s, p) => s + p.amountKurus, 0);
    for (const item of order.items) {
      const key = item.productId ?? item.productName;
      const entry = productMap.get(key) ?? {
        productId: item.productId ?? key,
        name: item.productName,
        unitsSold: 0,
        revenueKurus: 0,
      };
      entry.unitsSold += item.quantity;
      entry.revenueKurus += item.unitKurus * item.quantity;
      productMap.set(key, entry);
    }
  }

  const orderCount = orders.length;
  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    currency: "TRY",
    summary: {
      orders: orderCount,
      revenueKurus,
      averageBasketKurus: orderCount ? Math.round(revenueKurus / orderCount) : 0,
    },
    products: [...productMap.values()].sort((a, b) => b.unitsSold - a.unitsSold),
  };
}

export function hasEnoughDataForAnalysis(metrics: MenuMetricsSummary): boolean {
  return metrics.summary.orders >= 50 && metrics.products.length >= 5;
}

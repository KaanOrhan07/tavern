import { prisma } from "@/lib/prisma";
import { todayRange } from "@/lib/utils";
import { toBaseAmount } from "@/lib/units";

export type DailyReportData = {
  businessName: string;
  dateLabel: string;
  generatedAt: Date;
  totalKurus: number;
  cashKurus: number;
  cardKurus: number;
  paymentCount: number;
  orderCount: number;
  products: { name: string; quantity: number; revenueKurus: number }[];
  staff: { name: string; orderCount: number; itemCount: number }[];
  ingredients: { name: string; amount: number; unit: string }[];
};

/** Günün (İstanbul saatiyle) ciro, ürün satışı, personel bazlı sipariş ve tahmini malzeme tüketimi. */
export async function getDailyReportData(businessId: string): Promise<DailyReportData> {
  const { start, end } = todayRange();

  const [business, payments, orders] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }),
    prisma.payment.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { method: true, amountKurus: true },
    }),
    prisma.order.findMany({
      where: { businessId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      select: {
        createdBy: { select: { name: true } },
        items: {
          where: { status: { not: "CANCELLED" } },
          select: {
            productName: true,
            quantity: true,
            unitKurus: true,
            product: {
              select: {
                recipeItems: {
                  select: { amount: true, ingredient: { select: { name: true, unit: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  let cashKurus = 0;
  let cardKurus = 0;
  for (const p of payments) {
    if (p.method === "CASH") cashKurus += p.amountKurus;
    else cardKurus += p.amountKurus;
  }

  const products = new Map<string, { quantity: number; revenueKurus: number }>();
  const staff = new Map<string, { orderCount: number; itemCount: number }>();
  const ingredients = new Map<string, { amount: number; unit: string }>();

  for (const order of orders) {
    const staffName = order.createdBy?.name ?? "Müşteri (QR sipariş)";
    const s = staff.get(staffName) ?? { orderCount: 0, itemCount: 0 };
    s.orderCount += 1;
    for (const item of order.items) {
      s.itemCount += item.quantity;
      const p = products.get(item.productName) ?? { quantity: 0, revenueKurus: 0 };
      p.quantity += item.quantity;
      p.revenueKurus += item.quantity * item.unitKurus;
      products.set(item.productName, p);

      for (const r of item.product?.recipeItems ?? []) {
        const base = toBaseAmount(r.amount * item.quantity, r.ingredient.unit);
        const cur = ingredients.get(r.ingredient.name) ?? { amount: 0, unit: base.baseUnit };
        cur.amount += base.amount;
        ingredients.set(r.ingredient.name, cur);
      }
    }
    staff.set(staffName, s);
  }

  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "full",
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  return {
    businessName: business?.name ?? "İşletme",
    dateLabel,
    generatedAt: new Date(),
    totalKurus: cashKurus + cardKurus,
    cashKurus,
    cardKurus,
    paymentCount: payments.length,
    orderCount: orders.length,
    products: [...products].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.quantity - a.quantity),
    staff: [...staff].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.orderCount - a.orderCount),
    ingredients: [...ingredients]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount),
  };
}

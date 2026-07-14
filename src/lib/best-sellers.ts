import { prisma } from "@/lib/prisma";

/** Son N günde en çok satan ürünleri (aktif, stokta) döndürür. */
export async function getTopSellingProducts(
  businessId: string,
  limit = 5,
  days = 30
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const grouped = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: {
      order: {
        businessId,
        status: { not: "CANCELLED" },
        createdAt: { gte: since },
      },
    },
    _sum: { quantity: true },
  });

  const ranked = grouped
    .map((row) => ({
      productName: row.productName,
      quantity: row._sum.quantity ?? 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      businessId,
      active: true,
      name: { in: ranked.map((r) => r.productName) },
    },
    include: {
      recipeItems: {
        select: {
          amount: true,
          ingredient: { select: { quantity: true, unit: true } },
        },
      },
    },
  });

  const byName = new Map(products.map((p) => [p.name, p]));
  return ranked
    .map((r) => byName.get(r.productName))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
}

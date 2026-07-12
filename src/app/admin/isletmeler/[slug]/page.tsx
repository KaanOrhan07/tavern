import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFeatureMap } from "@/lib/features";
import { formatKurus, todayRange } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";
import { AdminBusinessControls } from "@/components/admin/AdminBusinessControls";

export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    include: { type: true },
  });
  if (!business) notFound();

  const { start, end } = todayRange();
  const [featureMap, tableCount, productCount, staffCount, openOrders, todayPayments] =
    await Promise.all([
      getFeatureMap(business.id),
      prisma.table.count({ where: { businessId: business.id } }),
      prisma.product.count({ where: { businessId: business.id } }),
      prisma.user.count({ where: { businessId: business.id, role: "STAFF" } }),
      prisma.order.count({ where: { businessId: business.id, status: "OPEN" } }),
      prisma.payment.aggregate({
        where: { businessId: business.id, createdAt: { gte: start, lt: end } },
        _sum: { amountKurus: true },
      }),
    ]);

  const stats = [
    { label: "Masa", value: String(tableCount) },
    { label: "Ürün", value: String(productCount) },
    { label: "Personel", value: String(staffCount) },
    { label: "Açık Sipariş", value: String(openOrders) },
    { label: "Bugünkü Ciro", value: formatKurus(todayPayments._sum.amountKurus ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{business.name}</h1>
          <p className="mt-0.5 text-xs text-cream-dim">
            /{business.slug} · {business.type.name} · Sipariş modu:{" "}
            {business.orderMode === "WAITER_ONLY" ? "Sadece Garson" : "Müşteri QR"}
          </p>
        </div>
        <Badge tone="warn">Salt Okunur Görünüm</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-lg font-semibold text-gold">{s.value}</p>
            <p className="mt-0.5 text-xs text-cream-dim">{s.label}</p>
          </Card>
        ))}
      </div>

      <AdminBusinessControls
        businessId={business.id}
        active={business.active}
        featureMap={featureMap}
      />
    </div>
  );
}

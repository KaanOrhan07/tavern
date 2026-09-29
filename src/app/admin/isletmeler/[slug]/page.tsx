import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFeatureMap } from "@/lib/features";
import { formatKurus, todayRange } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";
import { getAdminSession } from "@/lib/auth";
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

  const session = await getAdminSession();
  const { start, end } = todayRange();
  const [featureMap, tableCount, productCount, staffCount, openOrders, todayPayments, staffList] =
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
      prisma.user.findMany({
        where: { businessId: business.id, role: "STAFF" },
        select: { id: true, name: true, active: true },
        orderBy: { name: "asc" },
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
        <Badge tone={business.active ? "ok" : "danger"}>{business.active ? "Aktif" : "Pasif"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-lg font-semibold text-gold">{s.value}</p>
            <p className="mt-0.5 text-xs text-cream-dim">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-2 font-medium">Personel ({staffList.length})</p>
        {staffList.length === 0 ? (
          <p className="text-sm text-cream-dim">Personel yok</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {staffList.map((u) => (
              <Badge key={u.id} tone={u.active ? "neutral" : "danger"}>
                {u.name}
                {u.active ? "" : " (pasif)"}
              </Badge>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-cream-dim">
          Sipariş ve menü verisi salt okunurdur; işletme durumu ve özellikler bu sayfadan yönetilebilir.
        </p>
      </Card>

      <AdminBusinessControls
        businessId={business.id}
        businessName={business.name}
        active={business.active}
        featureMap={featureMap}
        isSuper={session?.level === "super"}
      />
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatKurus, todayRange } from "@/lib/utils";
import { CreateBusinessForm } from "@/components/admin/CreateBusinessForm";
import { AdminBusinessFilters } from "@/components/admin/AdminBusinessFilters";

export const dynamic = "force-dynamic";

export default async function BusinessListPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; active?: string }>;
}) {
  const { type, active } = await searchParams;

  const where: { type?: { key: string }; active?: boolean } = {};
  if (type) where.type = { key: type };
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;

  const { start, end } = todayRange();
  const [businesses, types, staffCounts, todayRevenue] = await Promise.all([
    prisma.business.findMany({
      where,
      include: { type: true, subscription: { select: { paymentStatus: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessType.findMany({ where: { active: true } }),
    prisma.user.groupBy({ by: ["businessId"], where: { role: "STAFF" }, _count: { _all: true } }),
    prisma.payment.groupBy({
      by: ["businessId"],
      where: { createdAt: { gte: start, lt: end } },
      _sum: { amountKurus: true },
    }),
  ]);
  const staffByBiz = new Map(staffCounts.map((r) => [r.businessId, r._count._all]));
  const revenueByBiz = new Map(todayRevenue.map((r) => [r.businessId, r._sum.amountKurus ?? 0]));
  const PAY_LABEL: Record<string, string> = { current: "Ödeme güncel", pending: "Ödeme bekliyor", overdue: "Ödeme gecikmiş" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">İşletmeler</h1>
        <CreateBusinessForm types={types.map((t) => ({ id: t.id, name: t.name }))} />
      </div>

      <Suspense fallback={null}>
        <AdminBusinessFilters types={types.map((t) => ({ key: t.key, name: t.name }))} />
      </Suspense>

      {businesses.length === 0 ? (
        <EmptyState
          title="Eşleşen işletme yok"
          description="Filtreleri değiştirin veya yeni işletme oluşturun."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {businesses.map((b) => (
            <Link key={b.id} href={`/admin/isletmeler/${b.slug}`}>
              <Card className="transition-colors hover:border-gold-dark">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="mt-0.5 text-xs text-cream-dim">
                      /{b.slug} · {b.type.name}
                    </p>
                  </div>
                  <Badge tone={b.active ? "ok" : "danger"}>
                    {b.active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cream-dim">
                  <span>{staffByBiz.get(b.id) ?? 0} personel</span>
                  <span>Bugün: {formatKurus(revenueByBiz.get(b.id) ?? 0)}</span>
                  {b.subscription && b.subscription.paymentStatus !== "current" && (
                    <Badge tone={b.subscription.paymentStatus === "overdue" ? "danger" : "warn"}>
                      {PAY_LABEL[b.subscription.paymentStatus] ?? b.subscription.paymentStatus}
                    </Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

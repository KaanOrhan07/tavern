import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { formatKurus, todayRange } from "@/lib/utils";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);

  const { start, end } = todayRange();
  const [openOrders, occupiedTables, totalTables, todayPayments, pendingRequests, productCount] =
    await Promise.all([
      prisma.order.count({ where: { businessId: session.businessId, status: "OPEN" } }),
      prisma.table.count({
        where: { businessId: session.businessId, orders: { some: { status: "OPEN" } } },
      }),
      prisma.table.count({ where: { businessId: session.businessId } }),
      prisma.payment.aggregate({
        where: { businessId: session.businessId, createdAt: { gte: start, lt: end } },
        _sum: { amountKurus: true },
      }),
      prisma.staffRequest.count({
        where: { businessId: session.businessId, status: "PENDING" },
      }),
      prisma.product.count({ where: { businessId: session.businessId, active: true } }),
    ]);

  const cards = [
    { label: "Bugünkü Ciro", value: formatKurus(todayPayments._sum.amountKurus ?? 0), href: `/panel/${isletmeSlug}/gun-sonu` },
    { label: "Dolu Masa", value: `${occupiedTables} / ${totalTables}`, href: `/panel/${isletmeSlug}/masalar` },
    { label: "Açık Sipariş", value: String(openOrders), href: `/panel/${isletmeSlug}/masalar` },
    { label: "Bekleyen Talep", value: String(pendingRequests), href: `/panel/${isletmeSlug}/talepler` },
    { label: "Aktif Ürün", value: String(productCount), href: `/panel/${isletmeSlug}/menu` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Genel Bakış</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="transition-colors hover:border-gold-dark">
              <p className="text-2xl font-semibold text-gold">{c.value}</p>
              <p className="mt-1 text-xs text-cream-dim">{c.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

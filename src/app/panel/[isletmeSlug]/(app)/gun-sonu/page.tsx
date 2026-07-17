import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { requireRestaurantModule } from "@/lib/panel-module-guard";
import { formatKurus, todayRange } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DayEndPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);
  await requireRestaurantModule(isletmeSlug, session.businessId);

  const { start, end } = todayRange();
  const payments = await prisma.payment.findMany({
    where: { businessId: session.businessId, createdAt: { gte: start, lt: end } },
    include: { order: { include: { table: { select: { name: true } } } } },
  });

  let totalKurus = 0;
  let cashKurus = 0;
  let cardKurus = 0;
  const byTable = new Map<string, { totalKurus: number; paymentCount: number }>();
  for (const p of payments) {
    totalKurus += p.amountKurus;
    if (p.method === "CASH") cashKurus += p.amountKurus;
    else cardKurus += p.amountKurus;
    const key = p.order.table.name;
    const entry = byTable.get(key) ?? { totalKurus: 0, paymentCount: 0 };
    entry.totalKurus += p.amountKurus;
    entry.paymentCount += 1;
    byTable.set(key, entry);
  }
  const tableRows = [...byTable.entries()]
    .map(([tableName, v]) => ({ tableName, ...v }))
    .sort((a, b) => b.totalKurus - a.totalKurus);

  const today = new Intl.DateTimeFormat("tr-TR", { dateStyle: "full" }).format(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Gün Sonu</h1>
        <p className="mt-0.5 text-xs text-cream-dim">{today}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-2xl font-semibold text-gold">{formatKurus(totalKurus)}</p>
          <p className="mt-1 text-xs text-cream-dim">Günün Toplam Cirosu</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold">{formatKurus(cashKurus)}</p>
          <p className="mt-1 text-xs text-cream-dim">Nakit</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold">{formatKurus(cardKurus)}</p>
          <p className="mt-1 text-xs text-cream-dim">Kart</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-medium">Masa Bazlı Ciro</h2>
        {tableRows.length === 0 ? (
          <EmptyState title="Bugün henüz ödeme alınmadı" />
        ) : (
          <Card className="p-0">
            <div className="divide-y divide-ink-line">
              {tableRows.map((row) => (
                <div key={row.tableName} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{row.tableName}</p>
                    <p className="mt-0.5 text-xs text-cream-dim">
                      {row.paymentCount} ödeme
                    </p>
                  </div>
                  <p className="font-semibold text-gold">{formatKurus(row.totalKurus)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { requireRestaurantModule } from "@/lib/panel-module-guard";
import { getFeatureMap } from "@/lib/features";
import { TableDetail } from "@/components/panel/TableDetail";

export const dynamic = "force-dynamic";

export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string; masaId: string }>;
}) {
  const { isletmeSlug, masaId } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  await requireRestaurantModule(isletmeSlug, session.businessId);

  const [table, business, categories, features] = await Promise.all([
    prisma.table.findFirst({
      where: { id: masaId, businessId: session.businessId },
    }),
    prisma.business.findUnique({ where: { id: session.businessId } }),
    prisma.category.findMany({
      where: { businessId: session.businessId },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, priceKurus: true, imageUrl: true },
        },
      },
    }),
    getFeatureMap(session.businessId),
  ]);
  if (!table || !business) notFound();

  return (
    <TableDetail
      slug={isletmeSlug}
      tableId={table.id}
      tableName={table.name}
      qrToken={table.qrToken}
      orderMode={business.orderMode}
      isOwner={session.role === "owner"}
      printerEnabled={features.kitchen_printer}
      categories={categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          products: c.products,
        }))}
    />
  );
}

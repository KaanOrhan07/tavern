import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerTable } from "@/components/musteri/CustomerTable";

export const dynamic = "force-dynamic";

// [masaId] = masanın qrToken değeri (QR koddan gelir)
export default async function CustomerTablePage({
  params,
}: {
  params: Promise<{ isletmeSlug: string; masaId: string }>;
}) {
  const { isletmeSlug, masaId } = await params;
  const table = await prisma.table.findUnique({
    where: { qrToken: masaId },
    include: { business: true },
  });
  if (!table || table.business.slug !== isletmeSlug || !table.business.active) {
    notFound();
  }

  const categories = await prisma.category.findMany({
    where: { businessId: table.businessId },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          priceKurus: true,
          imageUrl: true,
          allergens: true,
        },
      },
    },
  });

  return (
    <CustomerTable
      slug={isletmeSlug}
      qrToken={table.qrToken}
      tableName={table.name}
      orderMode={table.business.orderMode}
      categories={categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({ id: c.id, name: c.name, products: c.products }))}
    />
  );
}

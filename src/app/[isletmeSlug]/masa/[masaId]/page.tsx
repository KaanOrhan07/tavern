import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPublicMenuData } from "@/lib/public-menu-data";
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

  const menuData = await loadPublicMenuData(table.businessId);

  return (
    <CustomerTable
      slug={isletmeSlug}
      qrToken={table.qrToken}
      tableName={table.name}
      orderMode={table.business.orderMode}
      menuCategories={menuData.menuCategories}
      dailyProduct={menuData.dailyProduct}
      suggestionEnabled={menuData.suggestionEnabled}
      loyaltyEnabled={menuData.loyaltyEnabled}
    />
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPublicMenuData } from "@/lib/public-menu-data";
import { SuggestionWidget } from "@/components/musteri/SuggestionWidget";
import { DailyPick } from "@/components/musteri/DailyPick";
import { MenuList } from "@/components/musteri/MenuList";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ isletmeSlug: string }>;
  searchParams: Promise<{ masa?: string }>;
}) {
  const { isletmeSlug } = await params;
  const { masa } = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
  });
  if (!business || !business.active) notFound();

  const [menuData, table] = await Promise.all([
    loadPublicMenuData(business.id),
    masa ? prisma.table.findUnique({ where: { qrToken: masa } }) : Promise.resolve(null),
  ]);

  const canOrder =
    business.orderMode === "CUSTOMER_QR" && table !== null && table.businessId === business.id;
  const qrToken = canOrder ? masa! : null;

  return (
    <div className="space-y-8 pb-32">
      <h1 className="text-lg font-semibold">Menü</h1>

      {menuData.dailyProduct && (
        <DailyPick product={menuData.dailyProduct} isletmeSlug={isletmeSlug} masa={masa} />
      )}

      {menuData.suggestionEnabled && <SuggestionWidget slug={isletmeSlug} />}

      {menuData.menuCategories.length === 0 ? (
        <p className="py-12 text-center text-sm text-cream-dim">
          Menü henüz hazırlanıyor.
        </p>
      ) : (
        <MenuList
          isletmeSlug={isletmeSlug}
          categories={menuData.menuCategories}
          qrToken={qrToken}
          loyaltyEnabled={menuData.loyaltyEnabled}
        />
      )}
    </div>
  );
}

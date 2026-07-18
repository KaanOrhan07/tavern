import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPublicMenuData } from "@/lib/public-menu-data";
import { CustomerMenuApp } from "@/components/musteri/CustomerMenuApp";

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

  return (
    <CustomerMenuApp
      slug={isletmeSlug}
      businessName={business.name}
      logoUrl={business.logoUrl}
      bannerUrl={business.bannerUrl}
      qrToken={table && table.businessId === business.id ? masa! : null}
      canOrder={canOrder}
      tableName={table && table.businessId === business.id ? table.name : null}
      menuCategories={menuData.menuCategories}
      dailyProduct={menuData.dailyProduct}
      suggestionEnabled={menuData.suggestionEnabled}
      loyaltyEnabled={menuData.loyaltyEnabled}
      startOnWelcome
    />
  );
}

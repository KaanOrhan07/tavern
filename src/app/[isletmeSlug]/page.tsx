import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultCustomerPath, isBarberBusiness } from "@/lib/business-modules";
import { loadPublicMenuData } from "@/lib/public-menu-data";
import { CustomerMenuApp } from "@/components/musteri/CustomerMenuApp";

export const dynamic = "force-dynamic";

/** Müşteri kısa linki: restoran → karşılama+menü, berber → randevu. */
export default async function BusinessLandingPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
    include: { type: true },
  });
  if (!business || !business.active) notFound();

  if (isBarberBusiness(business.type.key)) {
    redirect(defaultCustomerPath(isletmeSlug, business.type.key));
  }

  const menuData = await loadPublicMenuData(business.id);

  return (
    <CustomerMenuApp
      slug={isletmeSlug}
      businessName={business.name}
      logoUrl={business.logoUrl}
      bannerUrl={business.bannerUrl}
      qrToken={null}
      tableName={null}
      menuCategories={menuData.menuCategories}
      dailyProduct={menuData.dailyProduct}
      suggestionEnabled={menuData.suggestionEnabled}
      loyaltyEnabled={menuData.loyaltyEnabled}
      startOnWelcome
    />
  );
}

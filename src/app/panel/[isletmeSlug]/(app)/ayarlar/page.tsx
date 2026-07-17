import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { getFeatureMap } from "@/lib/features";
import { isBarberBusiness } from "@/lib/business-modules";
import { SettingsView } from "@/components/panel/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") {
    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      include: { type: true },
    });
    redirect(
      business && isBarberBusiness(business.type.key)
        ? `/panel/${isletmeSlug}/randevular`
        : `/panel/${isletmeSlug}/masalar`
    );
  }

  const [business, features] = await Promise.all([
    prisma.business.findUnique({
      where: { id: session.businessId },
      include: { type: true },
    }),
    getFeatureMap(session.businessId),
  ]);
  if (!business) redirect("/panel");

  return (
    <SettingsView
      businessName={business.name}
      logoUrl={business.logoUrl}
      bannerUrl={business.bannerUrl}
      orderMode={business.orderMode}
      theme={business.theme}
      printerEnabled={features.kitchen_printer}
      loyaltyEnabled={features.loyalty_points}
      isBarber={isBarberBusiness(business.type.key)}
    />
  );
}

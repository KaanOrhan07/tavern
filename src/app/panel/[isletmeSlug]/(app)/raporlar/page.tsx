import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { isBarberBusiness } from "@/lib/business-modules";
import { getFeatureMap } from "@/lib/features";
import { ReportsView } from "@/components/panel/ReportsView";
import { BarberReportsView } from "@/components/panel/BarberReportsView";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    include: { type: true },
  });
  if (!business) redirect(`/panel/${isletmeSlug}/giris`);

  if (isBarberBusiness(business.type.key)) {
    return <BarberReportsView />;
  }

  const features = await getFeatureMap(session.businessId);

  return (
    <ReportsView
      bestSellersEnabled={features.best_sellers}
      forecastEnabled={features.ai_forecast}
    />
  );
}

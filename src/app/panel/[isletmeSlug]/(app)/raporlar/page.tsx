import { redirect } from "next/navigation";
import { getPanelSessionFor } from "@/lib/auth";
import { getFeatureMap } from "@/lib/features";
import { ReportsView } from "@/components/panel/ReportsView";

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

  const features = await getFeatureMap(session.businessId);

  return (
    <ReportsView
      bestSellersEnabled={features.best_sellers}
      forecastEnabled={features.ai_forecast}
    />
  );
}

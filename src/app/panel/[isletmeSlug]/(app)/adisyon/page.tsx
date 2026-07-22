import { redirect } from "next/navigation";
import { getPanelSessionFor } from "@/lib/auth";
import { requireRestaurantModule } from "@/lib/panel-module-guard";
import { KitchenDisplay } from "@/components/panel/KitchenDisplay";

export const dynamic = "force-dynamic";

export default async function KitchenPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  await requireRestaurantModule(isletmeSlug, session.businessId);

  return <KitchenDisplay />;
}

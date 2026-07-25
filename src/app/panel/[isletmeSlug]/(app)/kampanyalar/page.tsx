import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { requireRestaurantModule } from "@/lib/panel-module-guard";
import { CampaignManager } from "@/components/panel/CampaignManager";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);
  await requireRestaurantModule(isletmeSlug, session.businessId);

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: session.businessId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { translations: true },
  });

  return (
    <CampaignManager
      campaigns={campaigns.map((c) => ({
        id: c.id,
        displayType: c.displayType,
        active: c.active,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        translations: c.translations.map((t) => ({
          locale: t.locale,
          title: t.title,
          description: t.description,
          buttonText: t.buttonText,
        })),
      }))}
    />
  );
}

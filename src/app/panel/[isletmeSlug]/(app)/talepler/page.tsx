import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { requireRestaurantModule } from "@/lib/panel-module-guard";
import { isFeatureEnabled } from "@/lib/features";
import { RequestsBoard } from "@/components/panel/RequestsBoard";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (!(await isFeatureEnabled(session.businessId, "staff_requests"))) {
    redirect(`/panel/${isletmeSlug}/masalar`);
  }
  await requireRestaurantModule(isletmeSlug, session.businessId);

  const requests = await prisma.staffRequest.findMany({
    where: { businessId: session.businessId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <RequestsBoard
      isOwner={session.role === "owner"}
      requests={requests.map((r) => ({
        id: r.id,
        text: r.text,
        status: r.status,
        createdByName: r.createdBy?.name ?? "Bilinmiyor",
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}

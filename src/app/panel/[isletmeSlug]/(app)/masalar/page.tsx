import { redirect } from "next/navigation";
import { getPanelSessionFor } from "@/lib/auth";
import { TablesGrid } from "@/components/panel/TablesGrid";

export default async function TablesPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);

  return <TablesGrid slug={isletmeSlug} isOwner={session.role === "owner"} />;
}

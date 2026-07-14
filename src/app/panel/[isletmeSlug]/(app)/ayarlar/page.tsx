import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { getFeatureMap } from "@/lib/features";
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
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);

  const [business, features] = await Promise.all([
    prisma.business.findUnique({ where: { id: session.businessId } }),
    getFeatureMap(session.businessId),
  ]);
  if (!business) redirect("/panel");

  return (
    <SettingsView
      orderMode={business.orderMode}
      theme={business.theme}
      printerEnabled={features.kitchen_printer}
    />
  );
}

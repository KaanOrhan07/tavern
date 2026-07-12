import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/features";
import { StockManager } from "@/components/panel/StockManager";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);
  if (!(await isFeatureEnabled(session.businessId, "stock"))) {
    redirect(`/panel/${isletmeSlug}/dashboard`);
  }

  const ingredients = await prisma.ingredient.findMany({
    where: { businessId: session.businessId },
    orderBy: { name: "asc" },
  });

  return (
    <StockManager
      ingredients={ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
      }))}
    />
  );
}

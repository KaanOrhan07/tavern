import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { isBarberBusiness } from "@/lib/business-modules";
import { isFeatureEnabled } from "@/lib/features";
import { ServicesManager } from "@/components/panel/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/randevular`);

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    redirect(`/panel/${isletmeSlug}/dashboard`);
  }

  const [services, ingredients, stockEnabled] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: session.businessId },
      orderBy: { name: "asc" },
      include: { recipeItems: true },
    }),
    prisma.ingredient.findMany({
      where: { businessId: session.businessId },
      orderBy: { name: "asc" },
    }),
    isFeatureEnabled(session.businessId, "stock"),
  ]);

  return (
    <ServicesManager
      stockEnabled={stockEnabled}
      ingredients={ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceKurus: s.priceKurus,
        active: s.active,
        recipeItems: s.recipeItems.map((r) => ({
          ingredientId: r.ingredientId,
          amount: r.amount,
        })),
      }))}
    />
  );
}

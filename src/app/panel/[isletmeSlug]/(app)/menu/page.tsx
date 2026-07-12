import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { MenuManager } from "@/components/panel/MenuManager";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);

  const [categories, ingredients] = await Promise.all([
    prisma.category.findMany({
      where: { businessId: session.businessId },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          orderBy: { name: "asc" },
          include: { recipeItems: true },
        },
      },
    }),
    prisma.ingredient.findMany({
      where: { businessId: session.businessId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <MenuManager
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          priceKurus: p.priceKurus,
          imageUrl: p.imageUrl,
          description: p.description,
          active: p.active,
          calories: p.calories,
          allergens: p.allergens,
          categoryId: p.categoryId,
          recipe: p.recipeItems.map((r) => ({
            ingredientId: r.ingredientId,
            amount: r.amount,
          })),
        })),
      }))}
      ingredients={ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
      }))}
    />
  );
}

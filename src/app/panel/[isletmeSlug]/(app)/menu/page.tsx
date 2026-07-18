import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { requireRestaurantModule } from "@/lib/panel-module-guard";
import { isFeatureEnabled } from "@/lib/features";
import { MenuManager } from "@/components/panel/MenuManager";
import { toDisplayImageUrl } from "@/lib/storage-url";

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
  await requireRestaurantModule(isletmeSlug, session.businessId);

  const [categories, ingredients, variantsEnabled] = await Promise.all([
    prisma.category.findMany({
      where: { businessId: session.businessId },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          orderBy: { name: "asc" },
          include: {
            recipeItems: true,
            variants: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    }),
    prisma.ingredient.findMany({
      where: { businessId: session.businessId },
      orderBy: { name: "asc" },
    }),
    isFeatureEnabled(session.businessId, "product_variants"),
  ]);

  return (
    <MenuManager
      variantsEnabled={variantsEnabled}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          priceKurus: p.priceKurus,
          imageUrl: toDisplayImageUrl(p.imageUrl),
          description: p.description,
          active: p.active,
          calories: p.calories,
          allergens: p.allergens,
          vegan: p.vegan,
          vegetarian: p.vegetarian,
          glutenFree: p.glutenFree,
          aiApproved: p.aiApproved,
          categoryId: p.categoryId,
          recipe: p.recipeItems.map((r) => ({
            ingredientId: r.ingredientId,
            amount: r.amount,
          })),
          variants: p.variants.map((v) => ({ name: v.name, priceKurus: v.priceKurus })),
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

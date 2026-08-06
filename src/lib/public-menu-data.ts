import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { FEATURES, type FeatureKey } from "@/lib/feature-defs";
import { getTopSellingProducts } from "@/lib/best-sellers";
import { pickDailyProduct } from "@/lib/daily-pick";
import { isOutOfStock } from "@/lib/stock";
import { resolveProductCart } from "@/lib/menu-products";
import { toDisplayImageUrl } from "@/lib/storage-url";

export type PublicMenuProduct = {
  id: string;
  name: string;
  slug: string;
  priceKurus: number;
  imageUrl: string;
  calories: number | null;
  allergens: string[];
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  description: string | null;
  outOfStock: boolean;
  variants: { id: string; name: string; priceKurus: number }[];
  defaultCartKey: string;
  displayPriceKurus: number;
  hasVariants: boolean;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  icon: string | null;
  products: PublicMenuProduct[];
};

export type PublicMenuData = {
  menuCategories: PublicMenuCategory[];
  dailyProduct: PublicMenuProduct | null;
  suggestionEnabled: boolean;
  loyaltyEnabled: boolean;
};

async function loadFeatureFlags(businessId: string): Promise<Record<FeatureKey, boolean>> {
  const rows = await prisma.businessFeature.findMany({
    where: { businessId },
    select: { featureKey: true, enabled: true },
  });
  const map = new Map(rows.map((r) => [r.featureKey, r.enabled]));
  const result = {} as Record<FeatureKey, boolean>;
  for (const f of FEATURES) result[f.key] = map.get(f.key) ?? true;
  return result;
}

async function loadPublicMenuDataUncached(businessId: string): Promise<PublicMenuData> {
  const features = await loadFeatureFlags(businessId);
  const suggestionEnabled = features.ai_suggestion;
  const stockEnabled = features.stock;
  const bestsellersEnabled = features.best_sellers;
  const variantsEnabled = features.product_variants;
  const loyaltyEnabled = features.loyalty_points;

  const categories = await prisma.category.findMany({
    where: { businessId, active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { name: "asc" },
        include: {
          variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
          ...(stockEnabled
            ? {
                recipeItems: {
                  select: {
                    amount: true,
                    ingredient: { select: { quantity: true, unit: true } },
                  },
                },
              }
            : {}),
        },
      },
    },
  });

  type ProductRow = (typeof categories)[0]["products"][0] & {
    recipeItems?: {
      amount: number;
      ingredient: { quantity: number; unit: string };
    }[];
  };

  const mapProduct = (p: ProductRow): PublicMenuProduct => {
    const cart = resolveProductCart(p, variantsEnabled);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceKurus: p.priceKurus,
      imageUrl: toDisplayImageUrl(p.imageUrl),
      calories: p.aiApproved ? p.calories : null,
      allergens: p.aiApproved ? p.allergens : [],
      vegan: p.aiApproved ? p.vegan : false,
      vegetarian: p.aiApproved ? p.vegetarian : false,
      glutenFree: p.aiApproved ? p.glutenFree : false,
      description: p.description,
      outOfStock:
        stockEnabled && isOutOfStock({ recipeItems: p.recipeItems ?? [] }),
      variants: cart.variants,
      defaultCartKey: cart.defaultCartKey,
      displayPriceKurus: cart.displayPriceKurus,
      hasVariants: cart.hasVariants,
    };
  };

  const visibleCategories = categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl ? toDisplayImageUrl(c.imageUrl) : null,
      icon: c.icon,
      products: c.products.map((p) => mapProduct(p as ProductRow)),
    }));

  const allProducts = visibleCategories.flatMap((c) => c.products);
  const dailyProduct = pickDailyProduct(allProducts, businessId);

  let menuCategories = visibleCategories;
  if (bestsellersEnabled) {
    const top = await getTopSellingProducts(businessId, 5);
    const bestsellerProducts = top.map((p) => mapProduct(p as ProductRow));
    if (bestsellerProducts.length > 0) {
      menuCategories = [
        {
          id: "__bestsellers",
          name: "Çok Satanlar",
          slug: "cok-satanlar",
          description: null,
          imageUrl: null,
          icon: null,
          products: bestsellerProducts,
        },
        ...visibleCategories,
      ];
    }
  }

  return { menuCategories, dailyProduct, suggestionEnabled, loyaltyEnabled };
}

/** Müşteri menüsü — kısa süreli cache (katalog ağırlıklı). */
export function loadPublicMenuData(businessId: string): Promise<PublicMenuData> {
  return unstable_cache(
    () => loadPublicMenuDataUncached(businessId),
    ["public-menu", businessId],
    { revalidate: 45, tags: [`menu:${businessId}`] }
  )();
}

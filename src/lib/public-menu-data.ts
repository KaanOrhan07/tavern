import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { getTopSellingProducts } from "@/lib/best-sellers";
import { pickDailyProduct } from "@/lib/daily-pick";
import { isOutOfStock } from "@/lib/stock";
import { resolveProductCart } from "@/lib/menu-products";

export type PublicMenuProduct = {
  id: string;
  name: string;
  slug: string;
  priceKurus: number;
  imageUrl: string;
  calories: number | null;
  allergens: string[];
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
  products: PublicMenuProduct[];
};

export type PublicMenuData = {
  menuCategories: PublicMenuCategory[];
  dailyProduct: PublicMenuProduct | null;
  suggestionEnabled: boolean;
  loyaltyEnabled: boolean;
};

/** Müşteri menüsü ve QR masa sayfası için ortak kategori/ürün verisi. */
export async function loadPublicMenuData(businessId: string): Promise<PublicMenuData> {
  const [categories, suggestionEnabled, stockEnabled, bestsellersEnabled, variantsEnabled, loyaltyEnabled] =
    await Promise.all([
      prisma.category.findMany({
        where: { businessId },
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: { active: true },
            orderBy: { name: "asc" },
            include: {
              variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
              recipeItems: {
                select: {
                  amount: true,
                  ingredient: { select: { quantity: true, unit: true } },
                },
              },
            },
          },
        },
      }),
      isFeatureEnabled(businessId, "ai_suggestion"),
      isFeatureEnabled(businessId, "stock"),
      isFeatureEnabled(businessId, "best_sellers"),
      isFeatureEnabled(businessId, "product_variants"),
      isFeatureEnabled(businessId, "loyalty_points"),
    ]);

  const mapProduct = (p: (typeof categories)[0]["products"][0]): PublicMenuProduct => {
    const cart = resolveProductCart(p, variantsEnabled);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceKurus: p.priceKurus,
      imageUrl: p.imageUrl,
      calories: p.aiApproved ? p.calories : null,
      allergens: p.aiApproved ? p.allergens : [],
      description: p.description,
      outOfStock: stockEnabled && isOutOfStock(p),
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
      products: c.products.map(mapProduct),
    }));

  const allProducts = visibleCategories.flatMap((c) => c.products);
  const dailyProduct = pickDailyProduct(allProducts, businessId);

  let menuCategories = visibleCategories;
  if (bestsellersEnabled) {
    const top = await getTopSellingProducts(businessId, 5);
    const bestsellerProducts = top.map((p) => mapProduct(p));
    if (bestsellerProducts.length > 0) {
      menuCategories = [
        { id: "__bestsellers", name: "Çok Satanlar", products: bestsellerProducts },
        ...visibleCategories,
      ];
    }
  }

  return { menuCategories, dailyProduct, suggestionEnabled, loyaltyEnabled };
}

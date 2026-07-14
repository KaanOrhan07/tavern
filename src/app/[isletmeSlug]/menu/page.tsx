import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { getTopSellingProducts } from "@/lib/best-sellers";
import { pickDailyProduct } from "@/lib/daily-pick";
import { isOutOfStock } from "@/lib/stock";
import { resolveProductCart } from "@/lib/menu-products";
import { SuggestionWidget } from "@/components/musteri/SuggestionWidget";
import { DailyPick } from "@/components/musteri/DailyPick";
import { MenuList } from "@/components/musteri/MenuList";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ isletmeSlug: string }>;
  searchParams: Promise<{ masa?: string }>;
}) {
  const { isletmeSlug } = await params;
  const { masa } = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
  });
  if (!business || !business.active) notFound();

  const [categories, suggestionEnabled, stockEnabled, bestsellersEnabled, variantsEnabled, loyaltyEnabled, table] =
    await Promise.all([
      prisma.category.findMany({
        where: { businessId: business.id },
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
      isFeatureEnabled(business.id, "ai_suggestion"),
      isFeatureEnabled(business.id, "stock"),
      isFeatureEnabled(business.id, "best_sellers"),
      isFeatureEnabled(business.id, "product_variants"),
      isFeatureEnabled(business.id, "loyalty_points"),
      masa ? prisma.table.findUnique({ where: { qrToken: masa } }) : Promise.resolve(null),
    ]);

  const canOrder =
    business.orderMode === "CUSTOMER_QR" && table !== null && table.businessId === business.id;
  const qrToken = canOrder ? masa! : null;

  const mapProduct = (p: (typeof categories)[0]["products"][0]) => {
    const cart = resolveProductCart(p, variantsEnabled);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceKurus: p.priceKurus,
      imageUrl: p.imageUrl,
      allergens: p.allergens,
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
  const dailyProduct = pickDailyProduct(allProducts, business.id);

  let menuCategories = visibleCategories;
  if (bestsellersEnabled) {
    const top = await getTopSellingProducts(business.id, 5);
    const bestsellerProducts = top.map((p) => mapProduct(p));
    if (bestsellerProducts.length > 0) {
      menuCategories = [
        { id: "__bestsellers", name: "Çok Satanlar", products: bestsellerProducts },
        ...visibleCategories,
      ];
    }
  }

  return (
    <div className="space-y-8 pb-32">
      <h1 className="text-lg font-semibold">Menü</h1>

      {dailyProduct && (
        <DailyPick product={dailyProduct} isletmeSlug={isletmeSlug} masa={masa} />
      )}

      {suggestionEnabled && <SuggestionWidget slug={isletmeSlug} />}

      {menuCategories.length === 0 ? (
        <p className="py-12 text-center text-sm text-cream-dim">
          Menü henüz hazırlanıyor.
        </p>
      ) : (
        <MenuList
          isletmeSlug={isletmeSlug}
          categories={menuCategories}
          qrToken={qrToken}
          loyaltyEnabled={loyaltyEnabled}
        />
      )}
    </div>
  );
}

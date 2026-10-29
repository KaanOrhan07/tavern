import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { geoAccessOk } from "@/lib/geofence";
import { DEFAULT_ALLERGEN_NOTE, allergenIcon, allergenLabel, mapAllergenText } from "@/lib/allergens";
import { qrOrderingEnabled } from "@/lib/order-mode";
import { prisma } from "@/lib/prisma";
import { formatKurus } from "@/lib/utils";
import { isFeatureEnabled } from "@/lib/features";
import { isOutOfStock } from "@/lib/stock";
import { buildPriceEntries } from "@/lib/menu-products";
import { ProductImage } from "@/components/musteri/ProductImage";
import { ProductAddToCart } from "@/components/musteri/ProductAddToCart";

export const dynamic = "force-dynamic";

export default async function PublicProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ isletmeSlug: string; urunSlug: string }>;
  searchParams: Promise<{ masa?: string }>;
}) {
  const { isletmeSlug, urunSlug } = await params;
  const { masa } = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
    select: { id: true, active: true, orderMode: true, allergenNote: true },
  });
  if (!business || !business.active) notFound();
  // Konum doğrulanmadıysa menü sayfasına (kapıya) yönlendir
  if (!(await geoAccessOk(business.id, isletmeSlug))) {
    redirect(masa ? `/${isletmeSlug}/menu?masa=${encodeURIComponent(masa)}` : `/${isletmeSlug}/menu`);
  }

  const product = await prisma.product.findUnique({
    where: { businessId_slug: { businessId: business.id, slug: urunSlug } },
    include: {
      category: { select: { name: true } },
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      recipeItems: {
        include: { ingredient: { select: { name: true, quantity: true, unit: true } } },
      },
    },
  });
  if (!product || !product.active) notFound();

  const [table, stockEnabled, variantsEnabled, loyaltyEnabled, allProducts] = await Promise.all([
    masa ? prisma.table.findUnique({ where: { qrToken: masa } }) : Promise.resolve(null),
    isFeatureEnabled(business.id, "stock"),
    isFeatureEnabled(business.id, "product_variants"),
    isFeatureEnabled(business.id, "loyalty_points"),
    prisma.product.findMany({
      where: { businessId: business.id, active: true },
      include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  const biz = business;
  const shownAllergenKeys = product.allergenKeys.length > 0 ? product.allergenKeys : mapAllergenText(product.allergens);
  const outOfStock = stockEnabled && isOutOfStock(product);
  const canOrder =
    !outOfStock &&
    qrOrderingEnabled(business.orderMode) &&
    table !== null &&
    table.businessId === business.id;

  const menuHref = masa ? `/${isletmeSlug}/menu?masa=${masa}` : `/${isletmeSlug}/menu`;

  return (
    <div className="space-y-5 pb-32">
      <Link href={menuHref} className="text-sm text-cream-dim hover:text-cream">
        ← Menüye Dön
      </Link>

      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        className="aspect-square w-full rounded-2xl bg-ink-soft object-cover"
      />

      <div>
        <p className="text-xs text-cream-dim">{product.category.name}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="shrink-0 text-xl font-semibold text-gold">
            {formatKurus(product.priceKurus)}
          </p>
        </div>
        {outOfStock && (
          <p className="mt-1 text-sm font-medium text-danger">Tükendi</p>
        )}
        {product.description && (
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            {product.description}
          </p>
        )}
      </div>

      {/* İçerik */}
      {(product.ingredientsText || product.recipeItems.length > 0) && (
        <div className="rounded-xl border border-ink-line bg-ink-card p-4">
          <p className="mb-2 text-sm font-medium">İçindekiler</p>
          <p className="text-sm text-cream-dim">
            {product.ingredientsText || product.recipeItems.map((r) => r.ingredient.name).join(", ")}
          </p>
        </div>
      )}

      {/* Alkol / domuz bilgisi: işletmenin elle girdiği içerik bilgisi, onaydan bağımsız gösterilir */}
      {(product.containsAlcohol || product.containsPork) && (
        <div className="flex flex-wrap gap-2">
          {product.containsAlcohol && (
            <span className="rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs text-danger">
              🍷 Alkol içerir
            </span>
          )}
          {product.containsPork && (
            <span className="rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs text-danger">
              🐖 Domuz ürünü içerir
            </span>
          )}
        </div>
      )}

      {/* Kalori / diyet / alerjen — yalnızca işletme onayladıysa gösterilir */}
      <div className="rounded-xl border border-ink-line bg-ink-card p-4">
        {product.aiApproved ? (
          <>
            {(product.calories !== null || product.vegan || product.vegetarian || product.glutenFree) && (
              <p className="text-sm">
                {[
                  product.calories !== null ? `${product.calories} kalori` : null,
                  product.vegan ? "Vegan" : product.vegetarian ? "Vejetaryen" : null,
                  product.glutenFree ? "Glutensiz" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {shownAllergenKeys.length > 0 ? (
              <div className="mt-2">
                <p className="mb-1.5 text-xs font-medium text-cream-dim">Alerjenler</p>
                <div className="flex flex-wrap gap-2">
                  {shownAllergenKeys.map((k) => (
                    <span key={k} className="rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-1 text-xs text-warn">
                      {allergenIcon(k)} {allergenLabel(k, "TR")}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-cream-dim">Bilinen yaygın alerjen içermez.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-cream-dim">
            Bu ürünün alerjen bilgisi henüz doğrulanmadı — lütfen sipariş vermeden önce personele danışın.
          </p>
        )}
        <p className="mt-3 text-[11px] text-cream-dim/70">
          {biz.allergenNote?.trim() || DEFAULT_ALLERGEN_NOTE.TR}
        </p>
      </div>

      {canOrder && (
        <ProductAddToCart
          qrToken={masa!}
          productId={product.id}
          basePriceKurus={product.priceKurus}
          variants={variantsEnabled ? product.variants : []}
          priceEntries={buildPriceEntries(allProducts, variantsEnabled)}
          businessSlug={isletmeSlug}
          loyaltyEnabled={loyaltyEnabled}
        />
      )}
    </div>
  );
}

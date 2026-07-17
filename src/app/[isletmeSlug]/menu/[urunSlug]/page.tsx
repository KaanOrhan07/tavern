import Link from "next/link";
import { notFound } from "next/navigation";
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
    select: { id: true, active: true, orderMode: true },
  });
  if (!business || !business.active) notFound();

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
  const outOfStock = stockEnabled && isOutOfStock(product);
  const canOrder =
    !outOfStock &&
    business.orderMode === "CUSTOMER_QR" &&
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
      {product.recipeItems.length > 0 && (
        <div className="rounded-xl border border-ink-line bg-ink-card p-4">
          <p className="mb-2 text-sm font-medium">İçindekiler</p>
          <p className="text-sm text-cream-dim">
            {product.recipeItems.map((r) => r.ingredient.name).join(", ")}
          </p>
        </div>
      )}

      {/* Kalori / alerjen — işletme onayladıysa gösterilir */}
      {product.aiApproved && (product.calories !== null || product.allergens.length > 0) && (
        <div className="rounded-xl border border-ink-line bg-ink-card p-4">
          {product.calories !== null && (
            <p className="text-sm">
              <span className="font-medium">Kalori:</span>{" "}
              <span className="text-gold">~{product.calories} kcal</span>
            </p>
          )}
          {product.allergens.length > 0 ? (
            <p className="mt-2 text-sm text-warn">
              ⚠ Alerjen uyarısı: {product.allergens.join(", ")}
            </p>
          ) : (
            product.calories !== null && (
              <p className="mt-2 text-sm text-cream-dim">
                Bilinen yaygın alerjen içermez.
              </p>
            )
          )}
          <p className="mt-3 text-[11px] text-cream-dim/70">
            Kalori ve alerjen bilgileri yapay zekâ desteğiyle hesaplanmıştır. Ciddi
            alerjiniz varsa personele danışın.
          </p>
        </div>
      )}

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

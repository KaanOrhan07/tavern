import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { formatKurus } from "@/lib/utils";
import { SuggestionWidget } from "@/components/musteri/SuggestionWidget";
import { ProductImage } from "@/components/musteri/ProductImage";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
  });
  if (!business || !business.active) notFound();

  const [categories, suggestionEnabled] = await Promise.all([
    prisma.category.findMany({
      where: { businessId: business.id },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    isFeatureEnabled(business.id, "ai_suggestion"),
  ]);

  const visibleCategories = categories.filter((c) => c.products.length > 0);

  return (
    <div className="space-y-8 pb-8">
      <h1 className="text-lg font-semibold">Menü</h1>

      {suggestionEnabled && <SuggestionWidget slug={isletmeSlug} />}

      {visibleCategories.length === 0 ? (
        <p className="py-12 text-center text-sm text-cream-dim">
          Menü henüz hazırlanıyor.
        </p>
      ) : (
        visibleCategories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-3 border-b border-ink-line pb-2 text-sm font-semibold tracking-wide text-gold">
              {category.name}
            </h2>
            <div className="space-y-2.5">
              {category.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/${isletmeSlug}/menu/${product.slug}`}
                  className="flex items-center gap-3.5 rounded-xl border border-ink-line bg-ink-card p-3 transition-colors hover:border-gold-dark"
                >
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-16 w-16 shrink-0 rounded-lg bg-ink-soft object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{product.name}</p>
                    {product.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-cream-dim">
                        {product.description}
                      </p>
                    )}
                    {product.allergens.length > 0 && (
                      <p className="mt-1 text-[11px] text-warn">
                        ⚠ {product.allergens.join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold text-gold">
                    {formatKurus(product.priceKurus)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

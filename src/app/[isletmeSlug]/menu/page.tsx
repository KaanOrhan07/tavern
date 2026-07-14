import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { isOutOfStock } from "@/lib/stock";
import { SuggestionWidget } from "@/components/musteri/SuggestionWidget";
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

  // ?masa=<qrToken> ile gelindiyse (masa sayfasından "Menü" linki) ve sipariş
  // müşteri QR moduyla açıksa, bu sayfada da sepete ekleme kontrollerini göster.
  const [categories, suggestionEnabled, stockEnabled, table] = await Promise.all([
    prisma.category.findMany({
      where: { businessId: business.id },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: "asc" },
          include: {
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
    masa
      ? prisma.table.findUnique({ where: { qrToken: masa } })
      : Promise.resolve(null),
  ]);

  const canOrder =
    business.orderMode === "CUSTOMER_QR" && table !== null && table.businessId === business.id;
  const qrToken = canOrder ? masa! : null;

  const visibleCategories = categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      ...c,
      products: c.products.map((p) => ({ ...p, outOfStock: stockEnabled && isOutOfStock(p) })),
    }));

  return (
    <div className="space-y-8 pb-32">
      <h1 className="text-lg font-semibold">Menü</h1>

      {suggestionEnabled && <SuggestionWidget slug={isletmeSlug} />}

      {visibleCategories.length === 0 ? (
        <p className="py-12 text-center text-sm text-cream-dim">
          Menü henüz hazırlanıyor.
        </p>
      ) : (
        <MenuList isletmeSlug={isletmeSlug} categories={visibleCategories} qrToken={qrToken} />
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { isOutOfStock } from "@/lib/stock";
import { resolveProductCart } from "@/lib/menu-products";
import { CustomerTable } from "@/components/musteri/CustomerTable";

export const dynamic = "force-dynamic";

// [masaId] = masanın qrToken değeri (QR koddan gelir)
export default async function CustomerTablePage({
  params,
}: {
  params: Promise<{ isletmeSlug: string; masaId: string }>;
}) {
  const { isletmeSlug, masaId } = await params;
  const table = await prisma.table.findUnique({
    where: { qrToken: masaId },
    include: { business: true },
  });
  if (!table || table.business.slug !== isletmeSlug || !table.business.active) {
    notFound();
  }

  const [categories, stockEnabled, variantsEnabled, loyaltyEnabled] = await Promise.all([
    prisma.category.findMany({
      where: { businessId: table.businessId },
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
    isFeatureEnabled(table.businessId, "stock"),
    isFeatureEnabled(table.businessId, "product_variants"),
    isFeatureEnabled(table.businessId, "loyalty_points"),
  ]);

  return (
    <CustomerTable
      slug={isletmeSlug}
      qrToken={table.qrToken}
      tableName={table.name}
      orderMode={table.business.orderMode}
      loyaltyEnabled={loyaltyEnabled}
      categories={categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          products: c.products.map((p) => {
            const cart = resolveProductCart(p, variantsEnabled);
            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              priceKurus: p.priceKurus,
              imageUrl: p.imageUrl,
              allergens: p.allergens,
              outOfStock: stockEnabled && isOutOfStock(p),
              variants: cart.variants,
              defaultCartKey: cart.defaultCartKey,
              displayPriceKurus: cart.displayPriceKurus,
              hasVariants: cart.hasVariants,
            };
          }),
        }))}
    />
  );
}

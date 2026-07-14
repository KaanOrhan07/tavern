import { makeCartKey } from "@/lib/cart-key";

type VariantRow = { id: string; name: string; priceKurus: number; active?: boolean };

type ProductRow = {
  id: string;
  priceKurus: number;
  variants?: VariantRow[];
};

export function resolveProductCart(product: ProductRow, variantsEnabled: boolean) {
  const variants = variantsEnabled
    ? (product.variants ?? []).filter((v) => v.active !== false)
    : [];
  const hasVariants = variants.length > 0;
  const defaultVariant = variants[0];
  const defaultCartKey = hasVariants ? makeCartKey(product.id, defaultVariant.id) : product.id;
  const displayPriceKurus = hasVariants
    ? Math.min(...variants.map((v) => v.priceKurus))
    : product.priceKurus;

  return { variants, hasVariants, defaultCartKey, displayPriceKurus };
}

export function buildPriceEntries(
  products: ProductRow[],
  variantsEnabled: boolean
): [string, number][] {
  const entries: [string, number][] = [];
  for (const p of products) {
    const { variants, hasVariants } = resolveProductCart(p, variantsEnabled);
    if (hasVariants) {
      for (const v of variants) entries.push([makeCartKey(p.id, v.id), v.priceKurus]);
    } else {
      entries.push([p.id, p.priceKurus]);
    }
  }
  return entries;
}

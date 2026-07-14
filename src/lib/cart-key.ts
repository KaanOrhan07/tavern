/** Sepet satırı anahtarı: varyantlı ürünlerde productId:variantId */
export function makeCartKey(productId: string, variantId?: string) {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function parseCartKey(key: string): { productId: string; variantId?: string } {
  const sep = key.indexOf(":");
  if (sep === -1) return { productId: key };
  return { productId: key.slice(0, sep), variantId: key.slice(sep + 1) };
}

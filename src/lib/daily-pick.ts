/** İşletme + gün bazında deterministik "günün önerisi" seçer (gün boyunca aynı ürün). */
export function pickDailyProduct<T extends { id: string }>(
  products: T[],
  businessId: string,
  date = new Date()
): T | null {
  if (products.length === 0) return null;
  const seed = `${businessId}:${date.toISOString().slice(0, 10)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return products[Math.abs(hash) % products.length] ?? null;
}

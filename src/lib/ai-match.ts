/** AI önerilerini menüdeki ürünlerle eşleştirmek için isim normalizasyonu. */
function normalizeProductName(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşıöç]+/gi, "")
    .trim();
}

/** AI'ın döndürdüğü ürün adını menüdeki gerçek ürünle eşleştirir (tam / normalize / kısmi). */
export function resolveSuggestedProduct<T extends { name: string }>(
  aiName: string,
  products: T[]
): T | undefined {
  const trimmed = aiName.trim();
  if (!trimmed) return undefined;

  const exact = products.find((p) => p.name === trimmed);
  if (exact) return exact;

  const normalized = normalizeProductName(trimmed);
  if (!normalized) return undefined;

  const normalizedMatch = products.find((p) => normalizeProductName(p.name) === normalized);
  if (normalizedMatch) return normalizedMatch;

  const partialMatches = products.filter((p) => {
    const candidate = normalizeProductName(p.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });
  if (partialMatches.length === 1) return partialMatches[0];

  return undefined;
}

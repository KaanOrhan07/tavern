/** Stok ve reçete miktarları için desteklenen birimler. */
export const STOCK_UNITS = ["g", "kg", "ml", "lt", "adet"] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

type BaseUnit = "g" | "ml" | "adet";

/** Malzeme birimini saklama birimine (g / ml / adet) çevirir. */
export function toBaseAmount(amount: number, unit: string): { amount: number; baseUnit: BaseUnit } {
  switch (unit) {
    case "kg":
      return { amount: amount * 1000, baseUnit: "g" };
    case "g":
      return { amount, baseUnit: "g" };
    case "lt":
      return { amount: amount * 1000, baseUnit: "ml" };
    case "ml":
      return { amount, baseUnit: "ml" };
    case "adet":
      return { amount, baseUnit: "adet" };
    default:
      return { amount, baseUnit: "adet" };
  }
}

/** Veritabanına her zaman g / ml / adet olarak yazar (kg→g, lt→ml). */
export function normalizeForStorage(quantity: number, unit: string): { quantity: number; unit: string } {
  const { amount, baseUnit } = toBaseAmount(quantity, unit);
  return { quantity: amount, unit: baseUnit };
}

/** Reçetedeki miktar × adet kadar stok düşümünü taban birimde hesaplar. */
export function recipeDeductionBase(
  recipeAmount: number,
  ingredientUnit: string,
  orderQuantity: number
): number {
  return toBaseAmount(recipeAmount * orderQuantity, ingredientUnit).amount;
}

/** Mevcut stok miktarını taban birimde döndürür. */
export function stockBase(quantity: number, unit: string): number {
  return toBaseAmount(quantity, unit).amount;
}

/** Stok düşümünden sonra saklanacak miktar ve birim. */
export function afterDeduction(
  currentQuantity: number,
  currentUnit: string,
  deductBase: number
): { quantity: number; unit: string } {
  const { baseUnit } = toBaseAmount(1, currentUnit);
  const remaining = stockBase(currentQuantity, currentUnit) - deductBase;
  return { quantity: remaining, unit: baseUnit };
}

/** Panelde gösterim: büyük gram/ml değerlerini okunaklı yazar. */
export function formatStockQuantity(quantity: number, unit: string): string {
  const normalized = normalizeForStorage(quantity, unit);
  if (normalized.unit === "g" && normalized.quantity >= 1000) {
    const kg = normalized.quantity / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(2)} kg`;
  }
  if (normalized.unit === "ml" && normalized.quantity >= 1000) {
    const lt = normalized.quantity / 1000;
    return Number.isInteger(lt) ? `${lt} lt` : `${lt.toFixed(2)} lt`;
  }
  const display =
    normalized.quantity % 1 === 0
      ? String(normalized.quantity)
      : normalized.quantity.toFixed(1);
  return `${display} ${normalized.unit}`;
}

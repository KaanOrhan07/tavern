import { recipeDeductionBase, stockBase } from "@/lib/units";

export type ProductStockInfo = {
  recipeItems: { amount: number; ingredient: { quantity: number; unit: string } }[];
};

/**
 * Reçetesindeki herhangi bir malzemenin stoğu yetersizse ürün "tükendi" sayılır.
 * Miktarlar gram/ml/adet tabanında karşılaştırılır (kg/lt otomatik çevrilir).
 */
export function isOutOfStock(product: ProductStockInfo): boolean {
  if (product.recipeItems.length === 0) return false;
  return product.recipeItems.some((r) => {
    const available = stockBase(r.ingredient.quantity, r.ingredient.unit);
    const needed = recipeDeductionBase(r.amount, r.ingredient.unit, 1);
    return available < needed;
  });
}

/** Sipariş öncesi yeterli stok var mı kontrol eder. */
export function hasEnoughStock(
  product: ProductStockInfo,
  orderQuantity: number
): boolean {
  if (product.recipeItems.length === 0) return true;
  return product.recipeItems.every((r) => {
    const available = stockBase(r.ingredient.quantity, r.ingredient.unit);
    const needed = recipeDeductionBase(r.amount, r.ingredient.unit, orderQuantity);
    return available >= needed;
  });
}

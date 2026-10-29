import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { estimateCaloriesAndAllergens } from "@/lib/ai";
import { mapAllergenText } from "@/lib/allergens";

/**
 * Reçeteye göre kalori/alerjen/diyet etiketini AI ile HESAPLAR ve ürüne öneri olarak yazar.
 *
 * ÖNEMLİ (2.3.0): Sonuç ASLA otomatik onaylanmaz. Yanlış alerjen bilgisi sağlık riskidir; bu yüzden
 * ürün "onay bekliyor" (aiPending) olur ve işletme Menü → "AI Etiket Onayı" ekranından kontrol
 * edip onaylayana kadar müşteriye GÖSTERİLMEZ. Reçete değişirse önceki onay da düşer.
 */
export async function autoFillProductNutrition(businessId: string, productId: string) {
  if (!(await isFeatureEnabled(businessId, "ai_calorie"))) return false;

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    include: { recipeItems: { include: { ingredient: true } } },
  });
  if (!product || product.recipeItems.length === 0) return false;

  try {
    const result = await estimateCaloriesAndAllergens(
      product.name,
      product.recipeItems.map((r) => ({
        name: r.ingredient.name,
        unit: r.ingredient.unit,
        amount: r.amount,
      }))
    );
    await prisma.product.update({
      where: { id: productId },
      data: {
        calories: result.calories,
        allergens: result.allergens,
        allergenKeys: mapAllergenText(result.allergens),
        vegan: result.vegan,
        vegetarian: result.vegetarian,
        glutenFree: result.glutenFree,
        aiApproved: false,
        aiPending: true,
      },
    });
    return true;
  } catch (err) {
    console.error("[product-ai] Kalori/alerjen hesaplaması başarısız:", err);
    return false;
  }
}

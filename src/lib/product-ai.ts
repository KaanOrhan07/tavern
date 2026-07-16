import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { estimateCaloriesAndAllergens } from "@/lib/ai";

/** Ürün kaydından sonra reçeteye göre otomatik kalori/alerjen hesaplar. Hata olursa sessizce geçer. */
export async function autoFillProductNutrition(businessId: string, productId: string) {
  if (!(await isFeatureEnabled(businessId, "ai_calorie"))) return;

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    include: { recipeItems: { include: { ingredient: true } } },
  });
  if (!product || product.recipeItems.length === 0) return;

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
        aiApproved: true,
      },
    });
  } catch (err) {
    console.error("[product-ai] Kalori/alerjen hesaplaması başarısız:", err);
  }
}

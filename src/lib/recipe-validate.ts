import { prisma } from "@/lib/prisma";

/**
 * Reçete malzemeleri bu işletmeye ait olmalı ve tekrar etmemeli.
 * (Doğrulanmazsa başka işletmenin stoğu düşülebilir / benzersizlik hatası 500 döner.)
 * Hata varsa mesaj, yoksa null döner.
 */
export async function validateRecipeIngredients(
  businessId: string,
  items: { ingredientId: string }[]
): Promise<string | null> {
  const ids = items.map((i) => i.ingredientId);
  if (new Set(ids).size !== ids.length) return "Aynı malzeme reçetede birden fazla kez eklenemez";
  if (ids.length === 0) return null;
  const count = await prisma.ingredient.count({ where: { businessId, id: { in: ids } } });
  return count === ids.length ? null : "Reçetede geçersiz malzeme var";
}

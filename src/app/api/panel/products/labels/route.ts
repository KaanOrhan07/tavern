import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { writeAuditLog } from "@/lib/audit";
import { ALLERGEN_KEYS } from "@/lib/allergens";

const schema = z.object({
  productId: z.string().min(1),
  /**
   * approve: AI önerisini (düzenlenmiş hâliyle) onayla → müşteriye gösterilir
   * save:    elle düzenle; confirmed=true ise müşteriye gösterilir
   * reject:  AI sonucunu sil (kalori/alerjen/diyet temizlenir)
   */
  action: z.enum(["approve", "save", "reject"]),
  allergenKeys: z.array(z.enum(ALLERGEN_KEYS)).max(14).optional(),
  containsAlcohol: z.boolean().optional(),
  containsPork: z.boolean().optional(),
  ingredientsText: z.string().max(1000).nullable().optional(),
  calories: z.number().int().min(0).max(10_000).nullable().optional(),
  vegan: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  glutenFree: z.boolean().optional(),
  confirmed: z.boolean().optional(),
});

/** Ürün içerik etiketleri: AI öneri onayı + elle alerjen (AB-14) / alkol / domuz / içindekiler. */
export async function PATCH(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const d = body.data;

  const product = await prisma.product.findFirst({
    where: { id: d.productId, businessId: ctx.business.id },
    select: { id: true, name: true, aiApproved: true, aiPending: true },
  });
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  let data: Record<string, unknown>;
  if (d.action === "reject") {
    data = {
      calories: null,
      allergens: [],
      allergenKeys: [],
      vegan: false,
      vegetarian: false,
      glutenFree: false,
      aiApproved: false,
      aiPending: false,
    };
  } else {
    const ingredientsText = d.ingredientsText?.trim() || null;
    data = {
      ...(d.allergenKeys !== undefined && {
        allergenKeys: d.allergenKeys,
        // Eski serbest metin alanı da anahtarlarla senkron tutulur (tek doğruluk kaynağı: allergenKeys)
        allergens: d.allergenKeys,
      }),
      ...(d.containsAlcohol !== undefined && { containsAlcohol: d.containsAlcohol }),
      ...(d.containsPork !== undefined && { containsPork: d.containsPork }),
      ...(d.ingredientsText !== undefined && { ingredientsText }),
      ...(d.calories !== undefined && { calories: d.calories }),
      ...(d.vegan !== undefined && { vegan: d.vegan, ...(d.vegan && { vegetarian: true }) }),
      ...(d.vegetarian !== undefined && d.vegan !== true && { vegetarian: d.vegetarian }),
      ...(d.glutenFree !== undefined && { glutenFree: d.glutenFree }),
    };
    if (d.action === "approve") {
      data.aiApproved = true;
      data.aiPending = false;
    } else if (d.confirmed !== undefined) {
      data.aiApproved = d.confirmed;
      if (d.confirmed) data.aiPending = false;
    }
  }

  await prisma.product.update({ where: { id: product.id }, data });
  revalidateTag(`menu:${ctx.business.id}`, "max");

  await writeAuditLog({
    businessId: ctx.business.id,
    session: ctx.session,
    action: "UPDATE",
    entityType: "ProductLabels",
    entityId: product.id,
    beforeData: { aiApproved: product.aiApproved, aiPending: product.aiPending },
    metadata: { action: d.action, product: product.name },
    afterData: data,
  });
  return NextResponse.json({ ok: true });
}

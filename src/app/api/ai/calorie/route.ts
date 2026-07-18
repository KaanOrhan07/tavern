import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isFeatureEnabled } from "@/lib/features";
import { autoFillProductNutrition } from "@/lib/product-ai";

const schema = z.object({ productId: z.string().min(1) });

/** Reçeteden AI ile kalori + alerjen hesaplar ve ürüne kaydeder. */
export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  if (!(await isFeatureEnabled(ctx.business.id, "ai_calorie"))) {
    return NextResponse.json({ error: "Bu özellik kapalı" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: body.data.productId, businessId: ctx.business.id },
    include: { recipeItems: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }
  if (product.recipeItems.length === 0) {
    return NextResponse.json(
      { error: "Önce ürün reçetesini girin" },
      { status: 400 }
    );
  }

  try {
    const ok = await autoFillProductNutrition(ctx.business.id, body.data.productId);
    if (!ok) {
      return NextResponse.json(
        { error: "AI hesaplaması tamamlanamadı, tekrar deneyin" },
        { status: 502 }
      );
    }
    const updated = await prisma.product.findUnique({ where: { id: body.data.productId } });
    if (!updated) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      calories: updated.calories,
      allergens: updated.allergens,
      vegan: updated.vegan,
      vegetarian: updated.vegetarian,
      glutenFree: updated.glutenFree,
      aiApproved: updated.aiApproved,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Otomatik etiketleme başarısız oldu, elle girebilirsiniz",
      },
      { status: 502 }
    );
  }
}

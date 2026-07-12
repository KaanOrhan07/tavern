import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isFeatureEnabled } from "@/lib/features";
import { estimateCaloriesAndAllergens } from "@/lib/ai";

const schema = z.object({ productId: z.string().min(1) });

// Reçeteden AI ile kalori + alerjen hesaplar (otomatik kayıt product-ai.ts üzerinden)
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
    include: { recipeItems: { include: { ingredient: true } } },
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
    const result = await estimateCaloriesAndAllergens(
      product.name,
      product.recipeItems.map((r) => ({
        name: r.ingredient.name,
        unit: r.ingredient.unit,
        amount: r.amount,
      }))
    );
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { error: "AI hesaplaması başarısız oldu, tekrar deneyin" },
      { status: 502 }
    );
  }
}

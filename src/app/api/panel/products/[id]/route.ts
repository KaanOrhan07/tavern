import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { uploadProductImage } from "@/lib/storage";
import { parseTlToKurus } from "@/lib/utils";
import { autoFillProductNutrition } from "@/lib/product-ai";

const recipeSchema = z.array(
  z.object({ ingredientId: z.string().min(1), amount: z.number().positive() })
);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, businessId: ctx.business.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (form.has("name")) {
    const name = String(form.get("name")).trim();
    if (name.length < 1) return NextResponse.json({ error: "Geçersiz ad" }, { status: 400 });
    data.name = name;
  }
  if (form.has("price")) {
    const priceKurus = parseTlToKurus(String(form.get("price")));
    if (priceKurus === null) return NextResponse.json({ error: "Geçersiz fiyat" }, { status: 400 });
    data.priceKurus = priceKurus;
  }
  if (form.has("description")) {
    data.description = String(form.get("description")).trim() || null;
  }
  if (form.has("categoryId")) {
    const categoryId = String(form.get("categoryId"));
    const category = await prisma.category.findFirst({
      where: { id: categoryId, businessId: ctx.business.id },
    });
    if (!category) return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
    data.categoryId = categoryId;
  }
  if (form.has("active")) {
    data.active = String(form.get("active")) === "true";
  }

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    data.imageUrl = await uploadProductImage(ctx.business.id, image);
  }

  let recipeChanged = false;

  if (form.has("recipe")) {
    const recipe = recipeSchema.safeParse(JSON.parse(String(form.get("recipe"))));
    if (!recipe.success || recipe.data.length === 0) {
      return NextResponse.json({ error: "Geçersiz reçete" }, { status: 400 });
    }
    await prisma.recipeItem.deleteMany({ where: { productId: id } });
    await prisma.recipeItem.createMany({
      data: recipe.data.map((r) => ({ ...r, productId: id })),
    });
    recipeChanged = true;
  }

  const product = await prisma.product.update({ where: { id }, data });

  if (recipeChanged) {
    // Yanıtı geciktirmesin; arka planda çalışır
    after(() => autoFillProductNutrition(ctx.business.id, id));
  }

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  await prisma.product.deleteMany({
    where: { id, businessId: ctx.business.id },
  });
  return NextResponse.json({ ok: true });
}

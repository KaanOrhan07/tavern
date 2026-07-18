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

const variantSchema = z.array(
  z.object({
    name: z.string().min(1),
    priceKurus: z.number().int().positive(),
  })
);

async function saveVariants(productId: string, variants: z.infer<typeof variantSchema>) {
  await prisma.productVariant.deleteMany({ where: { productId } });
  if (variants.length === 0) return;
  await prisma.productVariant.createMany({
    data: variants.map((v, index) => ({
      productId,
      name: v.name,
      priceKurus: v.priceKurus,
      sortOrder: index,
    })),
  });
}

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
    try {
      data.imageUrl = await uploadProductImage(ctx.business.id, image);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Fotoğraf yüklenemedi" },
        { status: 400 }
      );
    }
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

  if (form.has("variants")) {
    const variants = variantSchema.safeParse(JSON.parse(String(form.get("variants"))));
    if (!variants.success) {
      return NextResponse.json({ error: "Geçersiz varyantlar" }, { status: 400 });
    }
    await saveVariants(id, variants.data);
  }

  if (form.has("calories")) {
    const raw = String(form.get("calories")).trim();
    if (raw === "") {
      data.calories = null;
    } else {
      const calories = Number.parseInt(raw, 10);
      if (!Number.isFinite(calories) || calories < 0) {
        return NextResponse.json({ error: "Geçersiz kalori değeri" }, { status: 400 });
      }
      data.calories = calories;
    }
  }
  if (form.has("allergens")) {
    const parsed = JSON.parse(String(form.get("allergens")));
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: "Geçersiz alerjen listesi" }, { status: 400 });
    }
    data.allergens = parsed.map((a) => String(a).trim()).filter(Boolean);
  }
  if (form.has("vegan")) {
    data.vegan = String(form.get("vegan")) === "true";
  }
  if (form.has("vegetarian")) {
    data.vegetarian = String(form.get("vegetarian")) === "true";
  }
  if (form.has("glutenFree")) {
    data.glutenFree = String(form.get("glutenFree")) === "true";
  }
  if (form.has("aiApproved")) {
    data.aiApproved = String(form.get("aiApproved")) === "true";
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

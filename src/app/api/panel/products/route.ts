import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { uploadProductImage } from "@/lib/storage";
import { slugify, parseTlToKurus } from "@/lib/utils";
import { autoFillProductNutrition } from "@/lib/product-ai";

const recipeSchema = z.array(
  z.object({ ingredientId: z.string().min(1), amount: z.number().positive() })
);

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const categoryId = String(form.get("categoryId") ?? "");
  const priceKurus = parseTlToKurus(String(form.get("price") ?? ""));
  const description = String(form.get("description") ?? "").trim() || null;
  const image = form.get("image");
  const recipeRaw = String(form.get("recipe") ?? "[]");

  if (name.length < 1 || !categoryId || priceKurus === null) {
    return NextResponse.json({ error: "Eksik veya hatalı alanlar" }, { status: 400 });
  }
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Ürün fotoğrafı zorunludur" }, { status: 400 });
  }
  const recipe = recipeSchema.safeParse(JSON.parse(recipeRaw));
  if (!recipe.success) {
    return NextResponse.json({ error: "Geçersiz reçete" }, { status: 400 });
  }
  if (recipe.data.length === 0) {
    return NextResponse.json({ error: "Reçete girişi zorunludur (en az bir malzeme)" }, { status: 400 });
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId: ctx.business.id },
  });
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
  }

  const ingredientCount = await prisma.ingredient.count({
    where: {
      id: { in: recipe.data.map((r) => r.ingredientId) },
      businessId: ctx.business.id,
    },
  });
  if (ingredientCount !== recipe.data.length) {
    return NextResponse.json({ error: "Reçetedeki malzeme bulunamadı" }, { status: 404 });
  }

  const imageUrl = await uploadProductImage(ctx.business.id, image);

  const base = slugify(name);
  let slug = base;
  for (
    let i = 2;
    await prisma.product.findUnique({
      where: { businessId_slug: { businessId: ctx.business.id, slug } },
    });
    i++
  ) {
    slug = `${base}-${i}`;
  }

  const product = await prisma.product.create({
    data: {
      businessId: ctx.business.id,
      categoryId,
      name,
      slug,
      priceKurus,
      description,
      imageUrl,
      recipeItems: { create: recipe.data },
    },
  });

  // Reçete kaydedildikten sonra AI hesaplaması yanıtı geciktirmesin;
  // yanıt gönderildikten sonra arka planda çalışır (onay beklemez)
  after(() => autoFillProductNutrition(ctx.business.id, product.id));

  return NextResponse.json({ ok: true, product });
}

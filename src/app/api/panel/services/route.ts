import { validateRecipeIngredients } from "@/lib/recipe-validate";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isBarberBusiness } from "@/lib/business-modules";
import { parseTlToKurus } from "@/lib/utils";
import { uploadBookingImage } from "@/lib/storage";

const recipeSchema = z.array(
  z.object({ ingredientId: z.string().min(1), amount: z.number().positive() })
);

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Bu modül bu işletme türü için geçerli değil" }, { status: 403 });
  }

  const services = await prisma.service.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { name: "asc" },
    include: { recipeItems: true },
  });

  return NextResponse.json({ ok: true, services });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Bu modül bu işletme türü için geçerli değil" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const name = String(form.get("name") ?? "").trim();
  const durationMinutes = Number.parseInt(String(form.get("durationMinutes") ?? ""), 10);
  const priceKurus = parseTlToKurus(String(form.get("price") ?? ""));
  const recipeRaw = String(form.get("recipe") ?? "[]");
  const recipe = recipeSchema.safeParse(JSON.parse(recipeRaw));

  if (name.length < 1 || !Number.isFinite(durationMinutes) || durationMinutes < 5 || priceKurus === null) {
    return NextResponse.json({ error: "Eksik veya hatalı alanlar" }, { status: 400 });
  }
  if (!recipe.success) {
    return NextResponse.json({ error: "Geçersiz reçete" }, { status: 400 });
  }

  const recipeError = await validateRecipeIngredients(ctx.business.id, recipe.data);
  if (recipeError) return NextResponse.json({ error: recipeError }, { status: 400 });

  const descriptionRaw = String(form.get("description") ?? "").trim();
  let imageUrl: string | undefined;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadBookingImage(ctx.business.id, image, "service");
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Görsel yüklenemedi" },
        { status: 400 }
      );
    }
  }

  const service = await prisma.service.create({
    data: {
      businessId: ctx.business.id,
      name,
      durationMinutes,
      priceKurus,
      description: descriptionRaw || null,
      imageUrl,
      recipeItems: recipe.data.length
        ? { create: recipe.data }
        : undefined,
    },
  });

  return NextResponse.json({ ok: true, service });
}

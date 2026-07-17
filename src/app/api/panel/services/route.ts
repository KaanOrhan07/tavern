import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isBarberBusiness } from "@/lib/business-modules";
import { parseTlToKurus } from "@/lib/utils";

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

  const service = await prisma.service.create({
    data: {
      businessId: ctx.business.id,
      name,
      durationMinutes,
      priceKurus,
      recipeItems: recipe.data.length
        ? { create: recipe.data }
        : undefined,
    },
  });

  return NextResponse.json({ ok: true, service });
}

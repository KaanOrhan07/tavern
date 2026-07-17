import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { parseTlToKurus } from "@/lib/utils";

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
  const existing = await prisma.service.findFirst({
    where: { id, businessId: ctx.business.id },
  });
  if (!existing) return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (form.has("name")) {
    const name = String(form.get("name")).trim();
    if (name.length < 1) return NextResponse.json({ error: "Geçersiz ad" }, { status: 400 });
    data.name = name;
  }
  if (form.has("durationMinutes")) {
    const durationMinutes = Number.parseInt(String(form.get("durationMinutes")), 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
      return NextResponse.json({ error: "Geçersiz süre" }, { status: 400 });
    }
    data.durationMinutes = durationMinutes;
  }
  if (form.has("price")) {
    const priceKurus = parseTlToKurus(String(form.get("price")));
    if (priceKurus === null) return NextResponse.json({ error: "Geçersiz fiyat" }, { status: 400 });
    data.priceKurus = priceKurus;
  }
  if (form.has("active")) {
    data.active = String(form.get("active")) === "true";
  }

  if (form.has("recipe")) {
    const recipe = recipeSchema.safeParse(JSON.parse(String(form.get("recipe"))));
    if (!recipe.success) return NextResponse.json({ error: "Geçersiz reçete" }, { status: 400 });
    await prisma.serviceRecipeItem.deleteMany({ where: { serviceId: id } });
    if (recipe.data.length > 0) {
      await prisma.serviceRecipeItem.createMany({
        data: recipe.data.map((r) => ({ ...r, serviceId: id })),
      });
    }
  }

  const service = await prisma.service.update({ where: { id }, data });
  return NextResponse.json({ ok: true, service });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  await prisma.service.deleteMany({ where: { id, businessId: ctx.business.id } });
  return NextResponse.json({ ok: true });
}

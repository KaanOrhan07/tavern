import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { normalizeForStorage } from "@/lib/units";

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  unit: z.string().min(1).max(10).optional(),
  quantity: z.number().min(0).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const existing = await prisma.ingredient.findFirst({
    where: { id, businessId: ctx.business.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Malzeme bulunamadı" }, { status: 404 });
  }

  const unit = body.data.unit ?? existing.unit;
  const quantity = body.data.quantity ?? existing.quantity;
  const normalized = normalizeForStorage(quantity, unit);

  await prisma.ingredient.updateMany({
    where: { id, businessId: ctx.business.id },
    data: {
      ...body.data,
      ...(body.data.quantity !== undefined || body.data.unit !== undefined
        ? { quantity: normalized.quantity, unit: normalized.unit }
        : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const usedIn = await prisma.recipeItem.count({
    where: { ingredientId: id, ingredient: { businessId: ctx.business.id } },
  });
  if (usedIn > 0) {
    return NextResponse.json(
      { error: "Bu malzeme bir reçetede kullanılıyor, önce reçeteden çıkarın" },
      { status: 409 }
    );
  }
  await prisma.ingredient.deleteMany({
    where: { id, businessId: ctx.business.id },
  });
  return NextResponse.json({ ok: true });
}

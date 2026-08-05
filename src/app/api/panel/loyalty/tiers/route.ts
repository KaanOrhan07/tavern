import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isFeatureEnabled } from "@/lib/features";

const upsertSchema = z.object({
  id: z.string().optional(),
  tierName: z.string().min(1).max(40),
  minLifetimePoints: z.number().int().min(0),
  pointMultiplier: z.number().min(0.1).max(10).default(1),
  rankOrder: z.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;
  if (!(await isFeatureEnabled(ctx.business.id, "loyalty_points"))) {
    return NextResponse.json({ error: "Sadakat sistemi kapalı" }, { status: 403 });
  }

  const body = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  let tier;
  if (body.data.id) {
    const existing = await prisma.loyaltyTier.findFirst({
      where: { id: body.data.id, businessId: ctx.business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Seviye bulunamadı" }, { status: 404 });
    }
    tier = await prisma.loyaltyTier.update({
      where: { id: body.data.id },
      data: {
        tierName: body.data.tierName,
        minLifetimePoints: body.data.minLifetimePoints,
        pointMultiplier: body.data.pointMultiplier,
        rankOrder: body.data.rankOrder,
      },
    });
  } else {
    tier = await prisma.loyaltyTier.create({
      data: {
        businessId: ctx.business.id,
        tierName: body.data.tierName,
        minLifetimePoints: body.data.minLifetimePoints,
        pointMultiplier: body.data.pointMultiplier,
        rankOrder: body.data.rankOrder,
      },
    });
  }

  return NextResponse.json({ ok: true, tier });
}

export async function DELETE(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const tier = await prisma.loyaltyTier.findFirst({
    where: { id, businessId: ctx.business.id },
  });
  if (!tier) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.loyaltyTier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

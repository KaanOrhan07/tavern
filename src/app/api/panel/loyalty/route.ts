import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isFeatureEnabled } from "@/lib/features";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  pointsPerSpendKurus: z.number().int().min(1).max(100_000).optional(),
  redeemThresholdPoints: z.number().int().min(1).max(1_000_000).optional(),
  redeemDiscountPercent: z.number().int().min(1).max(100).optional(),
  earningMode: z.enum(["fixed", "spend_based"]).optional(),
  fixedPointsPerCompletion: z.number().int().min(0).max(10_000).optional(),
  tierSystemEnabled: z.boolean().optional(),
  referralInviterPoints: z.number().int().min(0).max(100_000).optional(),
  referralInviteePoints: z.number().int().min(0).max(100_000).optional(),
});

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const [config, tiers] = await Promise.all([
    prisma.loyaltyConfig.findUnique({ where: { businessId: ctx.business.id } }),
    prisma.loyaltyTier.findMany({
      where: { businessId: ctx.business.id },
      orderBy: { minLifetimePoints: "asc" },
    }),
  ]);

  return NextResponse.json({
    config: config ?? {
      pointsPerSpendKurus: 100,
      redeemThresholdPoints: 100,
      redeemDiscountPercent: 10,
      earningMode: "spend_based",
      fixedPointsPerCompletion: 10,
      tierSystemEnabled: true,
      referralInviterPoints: 50,
      referralInviteePoints: 25,
    },
    tiers,
  });
}

export async function PATCH(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  if (!(await isFeatureEnabled(ctx.business.id, "loyalty_points"))) {
    return NextResponse.json({ error: "Sadakat sistemi kapalı" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const config = await prisma.loyaltyConfig.upsert({
    where: { businessId: ctx.business.id },
    create: { businessId: ctx.business.id, ...body.data },
    update: body.data,
  });

  await writeAuditLog({
    businessId: ctx.business.id,
    session: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "LoyaltyConfig",
    entityId: ctx.business.id,
    afterData: config,
  });

  return NextResponse.json({ ok: true, config });
}

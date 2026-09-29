import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";

const schema = z.object({
  featureKey: z.enum(FEATURES.map((f) => f.key) as [string, ...string[]]),
  enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const business = await prisma.business.findUnique({ where: { id }, select: { name: true } });
  if (!business) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });

  const { featureKey, enabled } = body.data;
  await prisma.businessFeature.upsert({
    where: { businessId_featureKey: { businessId: id, featureKey } },
    update: { enabled },
    create: { businessId: id, featureKey, enabled },
  });
  const featureName = FEATURES.find((f) => f.key === featureKey)?.name ?? featureKey;
  await writeAdminAudit({
    admin: ctx.session,
    businessId: id,
    action: "SETTINGS_CHANGE",
    entityType: "BusinessFeature",
    entityId: featureKey,
    summary: `Özellik ${enabled ? "açıldı" : "kapatıldı"}: ${featureName} (${business.name})`,
    request,
  });
  return NextResponse.json({ ok: true });
}

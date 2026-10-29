import { NextResponse } from "next/server";
import { requirePanel, isGuardError } from "@/lib/guard";
import { getFeatureMap } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { upgradeRequired } from "@/lib/app-version";

/** Token geçerli mi + güncel kullanıcı/işletme/özellik bilgisi (uygulama açılışında çağrılır). */
export async function GET(request: Request) {
  if (upgradeRequired(request)) {
    return NextResponse.json({ error: "Uygulama sürümünüz eski, lütfen güncelleyin", upgradeRequired: true }, { status: 426 });
  }
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const [features, type] = await Promise.all([
    getFeatureMap(ctx.business.id),
    prisma.businessType.findUnique({ where: { id: ctx.business.typeId }, select: { key: true } }),
  ]);
  return NextResponse.json({
    ok: true,
    user: { id: ctx.session.userId, name: ctx.session.name, role: ctx.session.role },
    business: {
      id: ctx.business.id,
      slug: ctx.business.slug,
      name: ctx.business.name,
      typeKey: type?.key ?? null,
      orderMode: ctx.business.orderMode,
    },
    features,
    realtimeChannel: `tavern:${ctx.business.id}`,
  });
}

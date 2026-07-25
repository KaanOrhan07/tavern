import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destroyPanelSession } from "@/lib/auth";
import { requirePanel, isGuardError } from "@/lib/guard";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

/** Tüm cihazlardan çıkış: sessionVersion artırılır, mevcut cookie silinir. */
export async function POST(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  await prisma.user.update({
    where: { id: ctx.session.userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await destroyPanelSession();
  await writeAuditLog({
    session: ctx.session,
    action: "LOGOUT",
    entityType: "User",
    entityId: ctx.session.userId,
    metadata: { event: "revoke_all_sessions" },
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}

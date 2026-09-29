import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

function visibleTo(session: { role: string; userId: string }) {
  return session.role === "owner"
    ? {}
    : { OR: [{ targetUserId: null }, { targetUserId: session.userId }] };
}

export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  // Personel yalnızca genel + kendisine yönelik bildirimleri görür; sahip hepsini görür
  const notifications = await prisma.notification.findMany({
    where: { businessId: ctx.business.id, ...visibleTo(ctx.session) },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  await prisma.notification.updateMany({
    where: { businessId: ctx.business.id, readAt: null, ...visibleTo(ctx.session) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

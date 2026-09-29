import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";

/** Ana admin panel içi bildirimleri (ödeme günü yaklaşıyor vb.). */
export async function GET() {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;
  const [items, unread] = await Promise.all([
    prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.adminNotification.count({ where: { readAt: null } }),
  ]);
  return NextResponse.json({ ok: true, items, unread });
}

export async function PATCH() {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;
  await prisma.adminNotification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const notifications = await prisma.notification.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  await prisma.notification.updateMany({
    where: { businessId: ctx.business.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

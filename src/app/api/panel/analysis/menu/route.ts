import { NextResponse } from "next/server";
import { requirePanel, isGuardError } from "@/lib/guard";
import { runMenuAnalysis } from "@/lib/menu-analysis/run";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const result = await runMenuAnalysis(ctx.business.id);
  return NextResponse.json(result);
}

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const latest = await prisma.menuAnalysis.findFirst({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ analysis: latest });
}

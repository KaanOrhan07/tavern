import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { enqueuePrintJob, hasPrintAgent } from "@/lib/print-queue";
import { broadcastBusiness } from "@/lib/realtime";

/** Son yazdırma işleri + ajan durumu (Ayarlar → Cihazlar). */
export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const [jobs, agent] = await Promise.all([
    prisma.printJob.findMany({
      where: { businessId: ctx.business.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, kind: true, status: true, attempts: true, error: true, createdAt: true, doneAt: true },
    }),
    hasPrintAgent(ctx.business.id),
  ]);
  return NextResponse.json({ ok: true, agentRegistered: agent, jobs });
}

/** Test fişi kuyruğa ekler (ajan çalışıyorsa birkaç saniye içinde yazdırır). */
export async function POST() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;
  if (!(await hasPrintAgent(ctx.business.id))) {
    return NextResponse.json({ error: "Önce bir yazdırma ajanı cihazı ekleyin" }, { status: 400 });
  }
  const id = await enqueuePrintJob({
    businessId: ctx.business.id,
    kind: "TEST",
    payload: { text: `Tavern test fişi — ${ctx.business.name}`, createdAt: new Date().toISOString() },
  });
  broadcastBusiness(ctx.business.id, "print");
  return NextResponse.json({ ok: true, jobId: id });
}

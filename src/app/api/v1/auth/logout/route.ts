import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const schema = z.object({ all: z.boolean().optional() });

/**
 * Bearer token stateless'tır: istemci token'ı silmesi yeterlidir.
 * `all: true` → tüm cihazlardaki oturumlar (web + uygulamalar) sonlandırılır (sessionVersion artar).
 */
export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (body.success && body.data.all) {
    const ctx = await requirePanel();
    if (isGuardError(ctx)) return ctx;
    await prisma.user.update({
      where: { id: ctx.session.userId },
      data: { sessionVersion: { increment: 1 } },
    });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const schema = z.object({
  orderMode: z.enum(["WAITER_ONLY", "CUSTOMER_QR"]),
});

export async function PATCH(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  await prisma.business.update({
    where: { id: ctx.business.id },
    data: { orderMode: body.data.orderMode },
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const schema = z.object({
  orderMode: z.enum(["WAITER_ONLY", "CUSTOMER_QR"]).optional(),
  theme: z.enum(["LIGHT", "DARK"]).optional(),
  name: z.string().min(1).max(80).optional(),
  kitchenCompletedClearMinutes: z.number().int().min(5).max(480).optional(),
});

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    select: {
      orderMode: true,
      theme: true,
      name: true,
      kitchenCompletedClearMinutes: true,
    },
  });
  if (!business) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ settings: business });
}

export async function PATCH(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (
    !body.success ||
    (!body.data.orderMode &&
      !body.data.theme &&
      !body.data.name &&
      body.data.kitchenCompletedClearMinutes === undefined)
  ) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  await prisma.business.update({
    where: { id: ctx.business.id },
    data: {
      ...(body.data.orderMode && { orderMode: body.data.orderMode }),
      ...(body.data.theme && { theme: body.data.theme }),
      ...(body.data.name && { name: body.data.name.trim() }),
      ...(body.data.kitchenCompletedClearMinutes !== undefined && {
        kitchenCompletedClearMinutes: body.data.kitchenCompletedClearMinutes,
      }),
    },
  });
  return NextResponse.json({ ok: true });
}

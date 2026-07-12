import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePanel, isGuardError } from "@/lib/guard";
import { recordPayment } from "@/lib/orders";

const schema = z.object({
  method: z.enum(["CASH", "CARD"]),
  itemPayments: z
    .array(z.object({ itemId: z.string().min(1), quantity: z.number().int().min(1) }))
    .min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  try {
    const result = await recordPayment({
      businessId: ctx.business.id,
      orderId: id,
      method: body.data.method,
      itemPayments: body.data.itemPayments,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ödeme kaydedilemedi" },
      { status: 400 }
    );
  }
}

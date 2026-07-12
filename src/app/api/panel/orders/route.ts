import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePanel, isGuardError } from "@/lib/guard";
import { addItemsToTable } from "@/lib/orders";

const createSchema = z.object({
  tableId: z.string().min(1),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1),
});

// Garson sipariş girişi
export async function POST(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  // "Müşteri QR" modunda garson sipariş giremez (brif 6.2)
  if (ctx.business.orderMode === "CUSTOMER_QR" ) {
    return NextResponse.json(
      { error: "Müşteri QR modunda garson sipariş giremez" },
      { status: 403 }
    );
  }

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  try {
    const result = await addItemsToTable({
      businessId: ctx.business.id,
      tableId: body.data.tableId,
      items: body.data.items,
      source: "WAITER",
      createdById: ctx.session.userId,
    });
    return NextResponse.json({ ok: true, orderId: result.order.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sipariş eklenemedi" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePanel, isGuardError } from "@/lib/guard";
import { addItemsToTable } from "@/lib/orders";
import { waiterOrderingEnabled } from "@/lib/order-mode";
import { beginIdempotent, completeIdempotent, getIdempotencyKey } from "@/lib/idempotency";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const createSchema = z.object({
  tableId: z.string().min(1),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1),
});

/**
 * Garson sipariş girişi. `Idempotency-Key` başlığı desteklenir: çevrimdışı kuyruktan veya yeniden denemeyle
 * aynı sipariş iki kez gelirse sunucu yalnızca bir kez uygular (web, masaüstü ve mobil istemciler ortak sözleşme).
 */
export async function POST(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  // Yalnızca "Müşteri QR" modunda garson sipariş giremez; "Garson + Müşteri QR" (BOTH) ikisine de izin verir
  if (!waiterOrderingEnabled(ctx.business.orderMode)) {
    return NextResponse.json(
      { error: "Müşteri QR modunda garson sipariş giremez" },
      { status: 403 }
    );
  }

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const idemKey = getIdempotencyKey(request);
  let recordId: string | null = null;
  if (idemKey) {
    const started = await beginIdempotent({
      businessId: ctx.business.id,
      key: idemKey,
      endpoint: "POST /api/panel/orders",
    });
    if (started.kind === "cached") return started.response;
    if (started.kind === "conflict") {
      return NextResponse.json({ error: "Bu sipariş isteği zaten işleniyor" }, { status: 409 });
    }
    recordId = started.recordId;
  }

  try {
    const result = await addItemsToTable({
      businessId: ctx.business.id,
      tableId: body.data.tableId,
      items: body.data.items,
      source: "WAITER",
      createdById: ctx.session.userId,
    });
    const payload = { ok: true, orderId: result.order.id };
    await writeAuditLog({
      session: ctx.session,
      action: "CREATE",
      entityType: "Order",
      entityId: result.order.id,
      afterData: { source: "WAITER", itemCount: body.data.items.length },
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    if (recordId) await completeIdempotent({ recordId, responseCode: 200, responseBody: payload });
    return NextResponse.json(payload);
  } catch (e) {
    const payload = { error: e instanceof Error ? e.message : "Sipariş eklenemedi" };
    if (recordId) await completeIdempotent({ recordId, responseCode: 400, responseBody: payload });
    return NextResponse.json(payload, { status: 400 });
  }
}

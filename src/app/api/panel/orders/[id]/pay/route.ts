import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePanel, isGuardError } from "@/lib/guard";
import { recordPayment } from "@/lib/orders";
import {
  beginIdempotent,
  completeIdempotent,
  getIdempotencyKey,
} from "@/lib/idempotency";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

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

  const idemKey = getIdempotencyKey(request);
  let recordId: string | null = null;
  if (idemKey) {
    const started = await beginIdempotent({
      businessId: ctx.business.id,
      key: idemKey,
      endpoint: `POST /api/panel/orders/${id}/pay`,
    });
    if (started.kind === "cached") return started.response;
    if (started.kind === "conflict") {
      return NextResponse.json(
        { error: "Bu ödeme isteği zaten işleniyor" },
        { status: 409 }
      );
    }
    recordId = started.recordId;
  }

  try {
    const result = await recordPayment({
      businessId: ctx.business.id,
      orderId: id,
      method: body.data.method,
      itemPayments: body.data.itemPayments,
    });
    const payload = { ok: true, ...result };
    await writeAuditLog({
      session: ctx.session,
      action: "PAYMENT",
      entityType: "Order",
      entityId: id,
      afterData: payload,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    if (recordId) {
      await completeIdempotent({
        recordId,
        responseCode: 200,
        responseBody: payload,
      });
    }
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ödeme kaydedilemedi";
    const payload = { error: message };
    if (recordId) {
      await completeIdempotent({
        recordId,
        responseCode: 400,
        responseBody: payload,
      });
    }
    return NextResponse.json(payload, { status: 400 });
  }
}

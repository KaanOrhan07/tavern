import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addItemsToTable } from "@/lib/orders";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import {
  beginIdempotent,
  completeIdempotent,
  getIdempotencyKey,
} from "@/lib/idempotency";
import { writeAuditLog } from "@/lib/audit";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  variantId: z.string().min(1).optional(),
  note: z.string().max(200).optional(),
});

const schema = z.object({
  qrToken: z.string().min(1),
  items: z.array(itemSchema).min(1),
  customerPhone: z.string().optional(),
  redeemLoyalty: z.boolean().optional(),
});

// Müşteri QR siparişi (yalnızca CUSTOMER_QR modunda)
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`public-order:${ip}`, {
    limit: 40,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek, lütfen bekleyin" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const table = await prisma.table.findUnique({
    where: { qrToken: body.data.qrToken },
    include: { business: true },
  });
  if (!table || !table.business.active) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }
  if (table.business.orderMode !== "CUSTOMER_QR") {
    return NextResponse.json(
      { error: "Bu işletmede sipariş garson aracılığıyla alınır" },
      { status: 403 }
    );
  }

  const tableLimited = await rateLimitAsync(
    `public-order:${ip}:${table.qrToken}`,
    { limit: 15, windowMs: 5 * 60 * 1000 }
  );
  if (!tableLimited.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek, lütfen bekleyin" },
      { status: 429, headers: { "Retry-After": String(tableLimited.retryAfterSec) } }
    );
  }

  const idemKey = getIdempotencyKey(request);
  let recordId: string | null = null;
  if (idemKey) {
    const started = await beginIdempotent({
      businessId: table.businessId,
      key: idemKey,
      endpoint: "POST /api/public/orders",
    });
    if (started.kind === "cached") return started.response;
    if (started.kind === "conflict") {
      return NextResponse.json(
        { error: "Bu sipariş isteği zaten işleniyor" },
        { status: 409 }
      );
    }
    recordId = started.recordId;
  }

  try {
    const result = await addItemsToTable({
      businessId: table.businessId,
      tableId: table.id,
      items: body.data.items,
      source: "CUSTOMER",
      customerPhone: body.data.customerPhone,
      redeemLoyalty: body.data.redeemLoyalty,
    });
    const payload = { ok: true, orderId: result.order.id };
    await writeAuditLog({
      businessId: table.businessId,
      action: "CREATE",
      entityType: "Order",
      entityId: result.order.id,
      afterData: { source: "CUSTOMER", itemCount: body.data.items.length },
      ipAddress: ip,
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
    const payload = {
      error: e instanceof Error ? e.message : "Sipariş verilemedi",
    };
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

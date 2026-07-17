import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addItemsToTable } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  variantId: z.string().min(1).optional(),
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
  const limited = rateLimit(`public-order:${ip}`, { limit: 40, windowMs: 15 * 60 * 1000 });
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

  try {
    await addItemsToTable({
      businessId: table.businessId,
      tableId: table.id,
      items: body.data.items,
      source: "CUSTOMER",
      customerPhone: body.data.customerPhone,
      redeemLoyalty: body.data.redeemLoyalty,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sipariş verilemedi" },
      { status: 400 }
    );
  }
}

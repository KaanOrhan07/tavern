import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";

const eventSchema = z.object({
  type: z.enum([
    "MENU_VIEW",
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "ADD_TO_CART",
    "REMOVE_FROM_CART",
    "ORDER_SUBMITTED",
  ]),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  timestamp: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const schema = z.object({
  sessionId: z.string().min(8).max(80),
  tableId: z.string().optional(),
  events: z.array(eventSchema).min(1).max(50),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`menu-events:${ip}`, {
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, active: true },
  });
  if (!business?.active) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  await prisma.menuEvent.createMany({
    data: body.data.events.map((e) => ({
      businessId: business.id,
      sessionId: body.data.sessionId,
      tableId: body.data.tableId,
      type: e.type,
      categoryId: e.categoryId,
      productId: e.productId,
      metadata: e.metadata
        ? (e.metadata as Prisma.InputJsonValue)
        : undefined,
    })),
  });

  return NextResponse.json({ ok: true });
}

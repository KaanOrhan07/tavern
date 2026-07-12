import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const schema = z.object({
  tableName: z.string().min(1),
  since: z.string().min(1),
});

/** Yeni sipariş bildirimi için mutfak fişi verisi (müşteri QR siparişleri dahil). */
export async function GET(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const url = new URL(request.url);
  const parsed = schema.safeParse({
    tableName: url.searchParams.get("tableName"),
    since: url.searchParams.get("since"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const since = new Date(parsed.data.since);
  const table = await prisma.table.findFirst({
    where: { businessId: ctx.business.id, name: parsed.data.tableName },
  });
  if (!table) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }

  const order = await prisma.order.findFirst({
    where: { businessId: ctx.business.id, tableId: table.id, status: "OPEN" },
    include: {
      items: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order || order.items.length === 0) {
    return NextResponse.json({ error: "Fiş verisi yok" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    tableName: table.name,
    items: order.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
    })),
  });
}

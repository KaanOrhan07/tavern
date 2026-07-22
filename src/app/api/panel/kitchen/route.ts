import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

/** Adisyon ekranı: bekleyen ve tamamlanan (görünür) sipariş kalemleri. */
export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    select: { kitchenCompletedClearMinutes: true },
  });
  const clearMinutes = business?.kitchenCompletedClearMinutes ?? 30;
  const clearSince = new Date(Date.now() - clearMinutes * 60_000);

  const [pending, completed] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        prepared: false,
        order: { businessId: ctx.business.id, status: "OPEN" },
      },
      include: {
        order: { include: { table: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.findMany({
      where: {
        prepared: true,
        preparedAt: { gte: clearSince },
        order: { businessId: ctx.business.id },
      },
      include: {
        order: { include: { table: { select: { name: true } } } },
      },
      orderBy: { preparedAt: "desc" },
    }),
  ]);

  const mapItem = (item: (typeof pending)[0]) => ({
    id: item.id,
    tableName: item.order.table.name,
    productName: item.productName,
    quantity: item.quantity,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
    preparedAt: item.preparedAt?.toISOString() ?? null,
  });

  return NextResponse.json({
    clearMinutes,
    pending: pending.map(mapItem),
    completed: completed.map(mapItem),
  });
}

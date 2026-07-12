import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Müşteri masa görünümü: masa durumu + açık sipariş (kimlik gerektirmez)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrToken: string }> }
) {
  const { qrToken } = await params;
  const table = await prisma.table.findUnique({
    where: { qrToken },
    include: {
      business: { select: { slug: true, name: true, active: true, orderMode: true } },
      orders: {
        where: { status: "OPEN" },
        include: { items: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!table || !table.business.active) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }

  const open = table.orders[0] ?? null;
  return NextResponse.json({
    business: {
      slug: table.business.slug,
      name: table.business.name,
      orderMode: table.business.orderMode,
    },
    table: { name: table.name },
    order: open
      ? {
          items: open.items.map((i) => ({
            productName: i.productName,
            unitKurus: i.unitKurus,
            quantity: i.quantity,
            paidQuantity: i.paidQuantity,
            delivered: i.delivered,
          })),
        }
      : null,
  });
}

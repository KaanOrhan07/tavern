import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

// Masa detayı: açık sipariş + kalemler + hesap durumu
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const table = await prisma.table.findFirst({
    where: { id, businessId: ctx.business.id },
    include: {
      orders: {
        where: { status: "OPEN" },
        include: { items: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!table) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }

  const open = table.orders[0] ?? null;

  // VIP / sık müşteri rozeti: telefon eşleşiyorsa işletmedeki sadakat kaydı
  let vip: { tierName: string | null; points: number; visits: number } | null = null;
  if (open?.customerPhone) {
    const [account, stats] = await Promise.all([
      prisma.loyaltyAccount.findUnique({
        where: { businessId_phone: { businessId: ctx.business.id, phone: open.customerPhone } },
        select: { points: true, tier: { select: { tierName: true } } },
      }),
      prisma.customerBusinessStats.findFirst({
        where: {
          businessId: ctx.business.id,
          customerProfile: { phone: open.customerPhone },
        },
        select: { totalVisits: true },
      }),
    ]);
    if (account || stats) {
      vip = {
        tierName: account?.tier?.tierName ?? null,
        points: account?.points ?? 0,
        visits: stats?.totalVisits ?? 0,
      };
    }
  }

  return NextResponse.json({
    table: { id: table.id, name: table.name, qrToken: table.qrToken },
    order: open
      ? {
          id: open.id,
          createdAt: open.createdAt,
          customerPhone: open.customerPhone,
          loyaltyDiscountKurus: open.loyaltyDiscountKurus,
          items: open.items.map((i) => ({
            id: i.id,
            productName: i.productName,
            unitKurus: i.unitKurus,
            quantity: i.quantity,
            paidQuantity: i.paidQuantity,
            delivered: i.delivered,
            status: i.status,
          })),
        }
      : null,
    vip,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const openOrder = await prisma.order.findFirst({
    where: { tableId: id, businessId: ctx.business.id, status: "OPEN" },
  });
  if (openOrder) {
    return NextResponse.json(
      { error: "Açık siparişi olan masa silinemez" },
      { status: 409 }
    );
  }
  await prisma.table.deleteMany({
    where: { id, businessId: ctx.business.id },
  });
  return NextResponse.json({ ok: true });
}

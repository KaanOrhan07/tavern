import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";

export async function GET(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId") || undefined;
  const itemStatus = url.searchParams.get("status") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const minKurus = url.searchParams.get("minKurus");
  const maxKurus = url.searchParams.get("maxKurus");

  const orders = await prisma.order.findMany({
    where: {
      status: "OPEN",
      ...(businessId ? { businessId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      business: { select: { id: true, name: true, slug: true } },
      table: { select: { name: true } },
      items: {
        where: itemStatus
          ? { status: itemStatus as "PENDING" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED" }
          : { status: { not: "CANCELLED" } },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const rows = orders
    .map((o) => {
      const totalKurus = o.items.reduce((s, i) => s + i.unitKurus * i.quantity, 0);
      const paidKurus = o.payments.reduce((s, p) => s + p.amountKurus, 0);
      const statuses = [...new Set(o.items.map((i) => i.status))];
      return {
        id: o.id,
        business: o.business,
        tableName: o.table.name,
        createdAt: o.createdAt,
        totalKurus,
        paidKurus,
        itemStatuses: statuses,
        itemCount: o.items.length,
      };
    })
    .filter((r) => {
      if (minKurus && r.totalKurus < Number(minKurus)) return false;
      if (maxKurus && r.totalKurus > Number(maxKurus)) return false;
      return true;
    });

  return NextResponse.json({ ok: true, orders: rows });
}

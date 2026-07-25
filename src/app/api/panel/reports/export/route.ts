import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

/** Günlük ödeme CSV export (server-side). */
export async function GET(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const fromDate = from ? new Date(from) : new Date(new Date().toDateString());
  const toDate = to
    ? new Date(to)
    : new Date(fromDate.getTime() + 86_400_000);

  const payments = await prisma.payment.findMany({
    where: {
      businessId: ctx.business.id,
      createdAt: { gte: fromDate, lt: toDate },
    },
    include: {
      order: { include: { table: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const lines = [
    "id,createdAt,table,method,amountKurus,amountTry",
    ...payments.map((p) =>
      [
        p.id,
        p.createdAt.toISOString(),
        JSON.stringify(p.order.table.name),
        p.method,
        p.amountKurus,
        (p.amountKurus / 100).toFixed(2),
      ].join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tavern-payments.csv"`,
    },
  });
}

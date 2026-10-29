import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { todayRange } from "@/lib/utils";

/** CSV hücresi: tırnaklar + Excel formül enjeksiyonu (=, +, -, @) engeli */
function csvCell(v: string): string {
  const needsGuard = ["=", "+", "-", "@", "\t", "\r"].includes(v.charAt(0));
  return JSON.stringify(needsGuard ? `'${v}` : v);
}

/** Ödeme CSV export (server-side). Tarih verilmezse bugün (İstanbul saatiyle). */
export async function GET(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const today = todayRange();
  const fromDate = from ? new Date(from) : today.start;
  const toDate = to ? new Date(to) : from ? new Date(fromDate.getTime() + 86_400_000) : today.end;
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }

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
    "id,createdAt,table,method,methodDetail,amountKurus,amountTry",
    ...payments.map((p) =>
      [
        p.id,
        p.createdAt.toISOString(),
        csvCell(p.order.table.name),
        p.method,
        csvCell(p.methodDetail ?? ""),
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

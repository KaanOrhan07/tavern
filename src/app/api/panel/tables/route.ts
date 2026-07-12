import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const tables = await prisma.table.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "asc" },
    include: {
      orders: {
        where: { status: "OPEN" },
        include: { items: true },
      },
    },
  });

  return NextResponse.json({
    tables: tables.map((t) => {
      const open = t.orders[0];
      const totalKurus =
        open?.items.reduce((sum, i) => sum + i.unitKurus * i.quantity, 0) ?? 0;
      const paidKurus =
        open?.items.reduce((sum, i) => sum + i.unitKurus * i.paidQuantity, 0) ?? 0;
      return {
        id: t.id,
        name: t.name,
        qrToken: t.qrToken,
        occupied: Boolean(open),
        openOrderId: open?.id ?? null,
        itemCount: open?.items.reduce((s, i) => s + i.quantity, 0) ?? 0,
        totalKurus,
        remainingKurus: totalKurus - paidKurus,
      };
    }),
  });
}

const createSchema = z.object({ name: z.string().min(1).max(50) });

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  try {
    const table = await prisma.table.create({
      data: { businessId: ctx.business.id, name: body.data.name.trim() },
    });
    return NextResponse.json({ ok: true, table });
  } catch {
    return NextResponse.json(
      { error: "Bu isimde bir masa zaten var" },
      { status: 409 }
    );
  }
}

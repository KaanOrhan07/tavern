import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const schema = z.object({
  mode: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
});

/** Tüm ürün fiyatlarına toplu zam uygular (yüzde veya sabit TL). */
export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: { businessId: ctx.business.id, active: true },
    select: { id: true, priceKurus: true },
  });
  if (products.length === 0) {
    return NextResponse.json({ error: "Güncellenecek ürün yok" }, { status: 400 });
  }

  const { mode, value } = body.data;
  await prisma.$transaction(
    products.map((p) => {
      let next = p.priceKurus;
      if (mode === "percent") {
        next = Math.round(p.priceKurus * (1 + value / 100));
      } else {
        next = p.priceKurus + Math.round(value);
      }
      return prisma.product.update({
        where: { id: p.id },
        data: { priceKurus: Math.max(1, next) },
      });
    })
  );

  return NextResponse.json({ ok: true, updated: products.length });
}

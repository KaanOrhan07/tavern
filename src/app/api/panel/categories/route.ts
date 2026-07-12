import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const createSchema = z.object({ name: z.string().min(1).max(60) });

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  try {
    const maxOrder = await prisma.category.aggregate({
      where: { businessId: ctx.business.id },
      _max: { sortOrder: true },
    });
    const category = await prisma.category.create({
      data: {
        businessId: ctx.business.id,
        name: body.data.name.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ ok: true, category });
  } catch {
    return NextResponse.json(
      { error: "Bu isimde bir kategori zaten var" },
      { status: 409 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { normalizeForStorage } from "@/lib/units";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  unit: z.string().min(1).max(10),
  quantity: z.number().min(0),
});

export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const ingredients = await prisma.ingredient.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ingredients });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  try {
    const normalized = normalizeForStorage(body.data.quantity, body.data.unit);
    const ingredient = await prisma.ingredient.create({
      data: {
        businessId: ctx.business.id,
        name: body.data.name.trim(),
        unit: normalized.unit,
        quantity: normalized.quantity,
      },
    });
    return NextResponse.json({ ok: true, ingredient });
  } catch {
    return NextResponse.json(
      { error: "Bu isimde bir malzeme zaten var" },
      { status: 409 }
    );
  }
}

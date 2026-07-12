import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const createSchema = z.object({
  name: z.string().min(2).max(60),
  pin: z.string().regex(/^\d{4,6}$/, "PIN 4-6 haneli rakam olmalı"),
});

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const staff = await prisma.user.findMany({
    where: { businessId: ctx.business.id, role: "STAFF" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, pin: true, active: true },
  });
  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek (PIN 4-6 hane olmalı)" }, { status: 400 });
  }
  try {
    const staff = await prisma.user.create({
      data: {
        businessId: ctx.business.id,
        role: "STAFF",
        name: body.data.name.trim(),
        pin: body.data.pin,
      },
    });
    return NextResponse.json({ ok: true, staff });
  } catch {
    return NextResponse.json(
      { error: "Bu PIN başka bir personelde kayıtlı" },
      { status: 409 }
    );
  }
}

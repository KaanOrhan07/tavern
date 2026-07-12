import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const patchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  try {
    await prisma.user.updateMany({
      where: { id, businessId: ctx.business.id, role: "STAFF" },
      data: body.data,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Bu PIN başka bir personelde kayıtlı" },
      { status: 409 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  await prisma.user.deleteMany({
    where: { id, businessId: ctx.business.id, role: "STAFF" },
  });
  return NextResponse.json({ ok: true });
}

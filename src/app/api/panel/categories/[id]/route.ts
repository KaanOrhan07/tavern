import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), name: z.string().min(1).max(60) }),
  z.object({ action: z.literal("reorder"), direction: z.enum(["up", "down"]) }),
]);

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

  if (body.data.action === "rename") {
    await prisma.category.updateMany({
      where: { id, businessId: ctx.business.id },
      data: { name: body.data.name.trim() },
    });
    return NextResponse.json({ ok: true });
  }

  const categories = await prisma.category.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
  }
  const swapIndex =
    body.data.direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) {
    return NextResponse.json({ ok: true });
  }
  const current = categories[index];
  const neighbor = categories[swapIndex];
  await prisma.$transaction([
    prisma.category.update({
      where: { id: current.id },
      data: { sortOrder: neighbor.sortOrder },
    }),
    prisma.category.update({
      where: { id: neighbor.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const productCount = await prisma.product.count({
    where: { categoryId: id, businessId: ctx.business.id },
  });
  if (productCount > 0) {
    return NextResponse.json(
      { error: "İçinde ürün olan kategori silinemez" },
      { status: 409 }
    );
  }
  await prisma.category.deleteMany({
    where: { id, businessId: ctx.business.id },
  });
  return NextResponse.json({ ok: true });
}

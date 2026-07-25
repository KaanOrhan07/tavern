import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { slugify } from "@/lib/utils";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), name: z.string().min(1).max(60) }),
  z.object({ action: z.literal("reorder"), direction: z.enum(["up", "down"]) }),
  z.object({
    action: z.literal("update"),
    description: z.string().max(500).optional().nullable(),
    imageUrl: z.string().max(2000).optional().nullable(),
    icon: z.string().max(40).optional().nullable(),
    active: z.boolean().optional(),
  }),
]);

async function uniqueCategorySlug(
  businessId: string,
  name: string,
  excludeId: string
): Promise<string> {
  const base = slugify(name) || "kategori";
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await prisma.category.findUnique({
      where: { businessId_slug: { businessId, slug } },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}

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
    const name = body.data.name.trim();
    const slug = await uniqueCategorySlug(ctx.business.id, name, id);
    try {
      const result = await prisma.category.updateMany({
        where: { id, businessId: ctx.business.id },
        data: { name, slug },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { error: "Bu isimde bir kategori zaten var" },
        { status: 409 }
      );
    }
  }

  if (body.data.action === "update") {
    const data: {
      description?: string | null;
      imageUrl?: string | null;
      icon?: string | null;
      active?: boolean;
    } = {};
    if ("description" in body.data) {
      data.description = body.data.description?.trim() || null;
    }
    if ("imageUrl" in body.data) {
      data.imageUrl = body.data.imageUrl?.trim() || null;
    }
    if ("icon" in body.data) {
      data.icon = body.data.icon?.trim() || null;
    }
    if (typeof body.data.active === "boolean") {
      data.active = body.data.active;
    }
    const result = await prisma.category.updateMany({
      where: { id, businessId: ctx.business.id },
      data,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
    }
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

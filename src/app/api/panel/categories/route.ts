import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
  active: z.boolean().optional(),
});

async function uniqueCategorySlug(businessId: string, name: string): Promise<string> {
  const base = slugify(name) || "kategori";
  let slug = base;
  for (
    let i = 2;
    await prisma.category.findUnique({
      where: { businessId_slug: { businessId, slug } },
    });
    i++
  ) {
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  try {
    const name = body.data.name.trim();
    const maxOrder = await prisma.category.aggregate({
      where: { businessId: ctx.business.id },
      _max: { sortOrder: true },
    });
    const slug = await uniqueCategorySlug(ctx.business.id, name);
    const category = await prisma.category.create({
      data: {
        businessId: ctx.business.id,
        name,
        slug,
        description: body.data.description?.trim() || null,
        imageUrl: body.data.imageUrl?.trim() || null,
        icon: body.data.icon?.trim() || null,
        active: body.data.active ?? true,
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

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  width: z.number().int().min(200).max(5000).optional(),
  height: z.number().int().min(200).max(5000).optional(),
});

export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const areas = await prisma.floorArea.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { sortOrder: "asc" },
    include: {
      tables: {
        select: {
          id: true,
          name: true,
          capacity: true,
          shape: true,
          posX: true,
          posY: true,
          width: true,
          height: true,
          rotation: true,
        },
      },
    },
  });
  return NextResponse.json({ areas });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const count = await prisma.floorArea.count({
    where: { businessId: ctx.business.id },
  });

  try {
    const area = await prisma.floorArea.create({
      data: {
        businessId: ctx.business.id,
        name: body.data.name.trim(),
        width: body.data.width ?? 1000,
        height: body.data.height ?? 700,
        sortOrder: count,
      },
    });
    return NextResponse.json({ ok: true, area });
  } catch {
    return NextResponse.json(
      { error: "Bu alan adı zaten kayıtlı" },
      { status: 409 }
    );
  }
}

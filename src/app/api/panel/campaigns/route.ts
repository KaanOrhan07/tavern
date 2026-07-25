import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const localeSchema = z.enum(["TR", "EN", "ES", "DE", "RU", "AR"]);

const createSchema = z.object({
  title: z.string().min(1).max(120),
  displayType: z.enum(["BANNER", "POPUP"]),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  locale: localeSchema.optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: ctx.business.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { translations: true },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const startsAt = new Date(body.data.startsAt);
  const endsAt = new Date(body.data.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json(
      { error: "Bitiş tarihi başlangıçtan sonra olmalı" },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.campaign.aggregate({
    where: { businessId: ctx.business.id },
    _max: { sortOrder: true },
  });

  const campaign = await prisma.campaign.create({
    data: {
      businessId: ctx.business.id,
      displayType: body.data.displayType,
      startsAt,
      endsAt,
      active: body.data.active ?? true,
      imageUrl: body.data.imageUrl?.trim() || null,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      translations: {
        create: {
          locale: body.data.locale ?? "TR",
          title: body.data.title.trim(),
        },
      },
    },
    include: { translations: true },
  });

  return NextResponse.json({ ok: true, campaign });
}

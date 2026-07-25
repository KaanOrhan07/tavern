import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const localeSchema = z.enum(["TR", "EN", "ES", "DE", "RU", "AR"]);

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  locale: localeSchema.optional(),
  displayType: z.enum(["BANNER", "POPUP"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().max(2000).optional().nullable(),
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

  const existing = await prisma.campaign.findFirst({
    where: { id, businessId: ctx.business.id },
    include: { translations: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
  }

  const startsAt = body.data.startsAt ? new Date(body.data.startsAt) : existing.startsAt;
  const endsAt = body.data.endsAt ? new Date(body.data.endsAt) : existing.endsAt;
  if (endsAt <= startsAt) {
    return NextResponse.json(
      { error: "Bitiş tarihi başlangıçtan sonra olmalı" },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      displayType: body.data.displayType,
      startsAt: body.data.startsAt ? startsAt : undefined,
      endsAt: body.data.endsAt ? endsAt : undefined,
      active: body.data.active,
      imageUrl:
        body.data.imageUrl !== undefined ? body.data.imageUrl?.trim() || null : undefined,
    },
    include: { translations: true },
  });

  if (body.data.title) {
    const locale = body.data.locale ?? "TR";
    const translation = existing.translations.find((t) => t.locale === locale);
    if (translation) {
      await prisma.campaignTranslation.update({
        where: { id: translation.id },
        data: { title: body.data.title.trim() },
      });
    } else {
      await prisma.campaignTranslation.create({
        data: {
          campaignId: id,
          locale,
          title: body.data.title.trim(),
        },
      });
    }
  }

  const updated = await prisma.campaign.findUnique({
    where: { id },
    include: { translations: true },
  });

  return NextResponse.json({ ok: true, campaign: updated ?? campaign });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const result = await prisma.campaign.deleteMany({
    where: { id, businessId: ctx.business.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

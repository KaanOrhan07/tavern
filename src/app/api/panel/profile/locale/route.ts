import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/generated/prisma/client";

const localeSchema = z.object({
  locale: z.string().refine(isValidLocale, "Geçersiz dil"),
});

/** Kullanıcının panel arayüz dil tercihini günceller. */
export async function PUT(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const body = localeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz dil" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: ctx.session.userId },
    data: { locale: body.data.locale as Locale },
    select: { locale: true },
  });

  return NextResponse.json({ ok: true, locale: user.locale });
}

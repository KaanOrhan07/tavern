import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { DEFAULT_LOCALE, LOCALES, isValidLocale } from "@/i18n/config";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import type { Locale } from "@/generated/prisma/client";

async function getOrCreateLocaleSettings(businessId: string) {
  const existing = await prisma.businessLocaleSettings.findUnique({
    where: { businessId },
  });
  if (existing) return existing;

  return prisma.businessLocaleSettings.create({
    data: {
      businessId,
      defaultLocale: DEFAULT_LOCALE,
      enabledLocales: [DEFAULT_LOCALE],
      autoDetect: true,
    },
  });
}

const localeUpdateSchema = z.object({
  defaultLocale: z.string().refine(isValidLocale, "Geçersiz varsayılan dil"),
  enabledLocales: z
    .array(z.string().refine(isValidLocale, "Geçersiz dil"))
    .min(1, "En az bir dil etkin olmalı"),
  autoDetect: z.boolean(),
});

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const settings = await getOrCreateLocaleSettings(ctx.business.id);
  return NextResponse.json({
    settings,
    availableLocales: LOCALES,
  });
}

export async function PUT(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = localeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz dil ayarları" },
      { status: 400 }
    );
  }

  const { defaultLocale, enabledLocales, autoDetect } = body.data;
  const enabled = [...new Set(enabledLocales)] as Locale[];

  if (!enabled.includes(defaultLocale as Locale)) {
    return NextResponse.json(
      { error: "Varsayılan dil etkin diller arasında olmalı" },
      { status: 400 }
    );
  }

  await getOrCreateLocaleSettings(ctx.business.id);

  const settings = await prisma.businessLocaleSettings.update({
    where: { businessId: ctx.business.id },
    data: {
      defaultLocale: defaultLocale as Locale,
      enabledLocales: enabled,
      autoDetect,
    },
  });

  await writeAuditLog({
    session: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "BusinessLocaleSettings",
    entityId: settings.id,
    afterData: {
      defaultLocale: settings.defaultLocale,
      enabledLocales: settings.enabledLocales,
      autoDetect: settings.autoDetect,
    },
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, settings });
}

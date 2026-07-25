import { NextResponse } from "next/server";
import { requirePanel, isGuardError } from "@/lib/guard";
import { themeUpdateSchema } from "@/lib/themes/schema";
import {
  getOrCreateThemeSettings,
  resetThemeSettings,
  updateThemeSettings,
} from "@/lib/themes/service";
import { THEME_PRESETS } from "@/lib/themes/presets";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { revalidateTag } from "next/cache";

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const theme = await getOrCreateThemeSettings(ctx.business.id);
  return NextResponse.json({ theme, presets: THEME_PRESETS });
}

export async function PUT(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = themeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz tema" },
      { status: 400 }
    );
  }

  const theme = await updateThemeSettings(ctx.business.id, body.data);
  revalidateTag(`theme:${ctx.business.id}`, "max");
  revalidateTag(`menu:${ctx.business.id}`, "max");
  await writeAuditLog({
    session: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "ThemeSettings",
    entityId: theme.id,
    afterData: { presetKey: theme.presetKey, themeVersion: theme.themeVersion },
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ ok: true, theme });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "reset") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const theme = await resetThemeSettings(ctx.business.id);
  revalidateTag(`theme:${ctx.business.id}`, "max");
  revalidateTag(`menu:${ctx.business.id}`, "max");
  await writeAuditLog({
    session: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "ThemeSettings",
    entityId: theme.id,
    metadata: { event: "reset" },
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ ok: true, theme });
}

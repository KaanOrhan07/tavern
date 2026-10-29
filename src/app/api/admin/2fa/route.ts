import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";
import { rateLimitAsync } from "@/lib/rate-limit";
import { generateTotpSecret, otpauthUri } from "@/lib/totp";
import {
  begin2faSetup,
  disable2fa,
  enable2fa,
  get2faState,
  totpBypassed,
  verify2faCode,
  type Actor,
} from "@/lib/admin-2fa";
import { isEncryptionConfigured } from "@/lib/crypto";

function actorOf(session: { level: "super" | "sub"; adminUserId?: string }): Actor {
  return { level: session.level, adminUserId: session.adminUserId };
}

/** Kendi hesabının 2FA durumu. */
export async function GET() {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;
  const state = await get2faState(actorOf(ctx.session));
  return NextResponse.json({
    ok: true,
    enabled: state.enabled,
    setupPending: Boolean(state.secret) && !state.enabled,
    bypassActive: totpBypassed(),
  });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({ action: z.literal("enable"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("disable"), code: z.string().regex(/^\d{6}$/) }),
]);

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;
  const actor = actorOf(ctx.session);

  const limited = await rateLimitAsync(`admin-2fa-setup:${ctx.session.adminUserId ?? "super"}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) return NextResponse.json({ error: "Çok fazla deneme" }, { status: 429 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  if (body.data.action === "setup") {
    if (!isEncryptionConfigured()) {
      return NextResponse.json({ error: "Şifreleme anahtarı yok (AUTH_SECRET tanımlı değil)" }, { status: 503 });
    }
    const state = await get2faState(actor);
    if (state.enabled) {
      return NextResponse.json({ error: "İki adımlı doğrulama zaten etkin. Yeniden kurmak için önce kapatın." }, { status: 409 });
    }
    const secret = generateTotpSecret();
    await begin2faSetup(actor, secret);
    const uri = otpauthUri({
      label: ctx.session.adminName || "admin",
      issuer: "Tavern Admin",
      secret,
    });
    const qr = await QRCode.toDataURL(uri, { width: 260, margin: 1 });
    return NextResponse.json({ ok: true, secret, uri, qr });
  }

  if (body.data.action === "enable") {
    const result = await verify2faCode(actor, body.data.code, { pendingOk: true });
    if (!result.ok) {
      return NextResponse.json({ error: "Kod hatalı. Uygulamadaki güncel 6 haneli kodu girin." }, { status: 400 });
    }
    await enable2fa(actor);
    await writeAdminAudit({
      admin: ctx.session,
      action: "SETTINGS_CHANGE",
      entityType: "Admin2FA",
      summary: "İki adımlı doğrulama etkinleştirildi",
      request,
    });
    return NextResponse.json({ ok: true });
  }

  // disable: güncel kod şart (oturumu ele geçiren biri 2FA'yı kapatamasın)
  const result = await verify2faCode(actor, body.data.code);
  if (!result.ok) {
    return NextResponse.json({ error: "Kod hatalı" }, { status: 400 });
  }
  await disable2fa(actor);
  await writeAdminAudit({
    admin: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "Admin2FA",
    summary: "İki adımlı doğrulama kapatıldı",
    request,
  });
  return NextResponse.json({ ok: true });
}

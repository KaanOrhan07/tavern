import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";
import { getGroqKeyStatus, setGroqApiKey } from "@/lib/settings";
import { isEncryptionConfigured } from "@/lib/crypto";

export async function GET() {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;
  return NextResponse.json({
    ok: true,
    encryptionConfigured: isEncryptionConfigured(),
    ...(await getGroqKeyStatus()),
  });
}

const schema = z.object({ key: z.string().trim().min(20).max(300) });

/** Groq key'i doğrular, AES-256-GCM ile DB'ye yazar — deploy gerekmeden anında devreye girer. */
export async function PUT(request: Request) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;
  if (!isEncryptionConfigured()) {
    return NextResponse.json({ error: "CREDENTIAL_ENCRYPTION_KEY tanımlı değil" }, { status: 503 });
  }
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz key" }, { status: 400 });

  // Kaydetmeden önce key'in gerçekten çalıştığını doğrula
  const check = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${body.data.key}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!check) {
    return NextResponse.json({ error: "Groq'a ulaşılamadı, tekrar deneyin" }, { status: 502 });
  }
  if (check.status === 401 || check.status === 403) {
    return NextResponse.json({ error: "Groq bu key'i reddetti (geçersiz)" }, { status: 400 });
  }

  await setGroqApiKey(body.data.key, ctx.session.adminName);
  await writeAdminAudit({
    admin: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "SystemSetting",
    entityId: "groq_api_key",
    summary: "Groq API key değiştirildi",
    request,
  });
  return NextResponse.json({ ok: true });
}

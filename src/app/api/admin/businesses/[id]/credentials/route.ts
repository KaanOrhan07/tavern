import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";
import { decryptSecret } from "@/lib/crypto";
import { buildPasswordFields, validateOwnerPassword } from "@/lib/password";

/** İşletme sahibinin e-postası + (şifrelenmiş kopyadan) şifresi — yalnızca ana admin, her görüntüleme loglanır. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const owner = await prisma.user.findFirst({
    where: { businessId: id, role: "OWNER" },
    select: { id: true, name: true, email: true, passwordEncrypted: true, business: { select: { name: true } } },
  });
  if (!owner) return NextResponse.json({ error: "İşletme sahibi bulunamadı" }, { status: 404 });

  let password: string | null = null;
  if (owner.passwordEncrypted) {
    try {
      password = decryptSecret(owner.passwordEncrypted);
    } catch {
      return NextResponse.json(
        { error: "Şifre çözülemedi (şifreleme anahtarı değişmiş olabilir)" },
        { status: 500 }
      );
    }
  }

  await writeAdminAudit({
    admin: ctx.session,
    businessId: id,
    action: "SETTINGS_CHANGE",
    entityType: "OwnerCredentials",
    entityId: owner.id,
    summary: `İşletme şifresi görüntülendi: ${owner.business.name}`,
    request,
  });

  return NextResponse.json({
    ok: true,
    ownerName: owner.name,
    email: owner.email,
    password,
    note: password
      ? null
      : "Bu hesabın şifresi 2.2.1 öncesinde oluşturuldu; şifre yenilenince burada görünür.",
  });
}

const setSchema = z.object({ password: z.string().min(6).max(200) });

/** Ana admin işletme şifresini değiştirir: hash + encrypted birlikte güncellenir, açık oturumlar düşer. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = setSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  const pwError = validateOwnerPassword(body.data.password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const owner = await prisma.user.findFirst({
    where: { businessId: id, role: "OWNER" },
    select: { id: true, business: { select: { name: true } } },
  });
  if (!owner) return NextResponse.json({ error: "İşletme sahibi bulunamadı" }, { status: 404 });

  await prisma.user.update({
    where: { id: owner.id },
    data: { ...(await buildPasswordFields(body.data.password)), sessionVersion: { increment: 1 } },
  });
  await writeAdminAudit({
    admin: ctx.session,
    businessId: id,
    action: "SETTINGS_CHANGE",
    entityType: "OwnerCredentials",
    entityId: owner.id,
    summary: `İşletme şifresi değiştirildi: ${owner.business.name}`,
    request,
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";
import { adminKeyFingerprint, safeEqual } from "@/lib/crypto";
import { hashPassword, validateOwnerPassword } from "@/lib/password";

/** Alt admin yönetimi — yalnızca ana admin (env key). Alt admin hesap oluşturamaz. */
export async function GET() {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;
  const admins = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      createdByLabel: true,
      role: true,
    },
  });
  return NextResponse.json({ ok: true, admins });
}

const createSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  key: z.string().min(10, "Admin anahtarı en az 10 karakter olmalı").max(200),
  password: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.enum(["SUPPORT", "SALES", "FINANCE"]).default("SUPPORT"),
});

export async function POST(request: Request) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz istek" },
      { status: 400 }
    );
  }
  const d = body.data;
  const pwError = validateOwnerPassword(d.password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
  // Alt admin anahtarı ana admin anahtarıyla çakışamaz
  if (process.env.ADMIN_KEY && safeEqual(d.key, process.env.ADMIN_KEY)) {
    return NextResponse.json({ error: "Bu anahtar kullanılamaz" }, { status: 400 });
  }
  const fingerprint = adminKeyFingerprint(d.key);
  const clash = await prisma.adminUser.findFirst({
    where: { OR: [{ keyFingerprint: fingerprint }, { email: d.email }] },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json({ error: "Bu anahtar veya e-posta zaten kullanımda" }, { status: 409 });
  }

  const admin = await prisma.adminUser.create({
    data: {
      name: `${d.firstName} ${d.lastName}`,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      keyFingerprint: fingerprint,
      passwordHash: await hashPassword(d.password),
      role: d.role,
      createdByLabel: ctx.session.adminName,
    },
    select: { id: true, name: true, email: true },
  });
  await writeAdminAudit({
    admin: ctx.session,
    action: "CREATE",
    entityType: "AdminUser",
    entityId: admin.id,
    summary: `Alt admin oluşturuldu: ${admin.name}`,
    request,
  });
  return NextResponse.json({ ok: true, admin });
}

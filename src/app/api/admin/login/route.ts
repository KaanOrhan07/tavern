import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession } from "@/lib/auth";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { adminKeyFingerprint, safeEqual } from "@/lib/crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { writeAdminAudit } from "@/lib/audit";

const schema = z.object({
  key: z.string().min(1).max(200),
  password: z.string().max(200).optional(),
});

// Zamanlama farkını gizlemek için sahte hash (anahtar bulunamasa da bcrypt çalışır)
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("tavern-dummy-password"));

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`admin-login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla deneme, lütfen bekleyin" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const { key, password } = body.data;

  // 1) Ana admin: sabit env anahtarı, şifre YOK
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && safeEqual(key, adminKey)) {
    await createAdminSession({ level: "super", adminName: "Ana Admin" });
    await writeAdminAudit({
      admin: { role: "admin", level: "super", adminName: "Ana Admin" },
      action: "LOGIN",
      entityType: "Admin",
      summary: "Ana admin girişi",
      request,
    });
    return NextResponse.json({ ok: true, level: "super" });
  }

  // 2) Alt admin: anahtar + şifre
  const admin = await prisma.adminUser.findUnique({
    where: { keyFingerprint: adminKeyFingerprint(key) },
  });
  const passwordOk = await verifyPassword(password ?? "", admin?.passwordHash ?? (await getDummyHash()));
  if (!admin || !admin.active || !password || !passwordOk) {
    // Şifre henüz istenmemişse arayüz ikinci alanı göstersin diye ayrı bir durum döner
    if (!password) {
      return NextResponse.json({ error: "Şifre gerekli", needPassword: true }, { status: 401 });
    }
    return NextResponse.json({ error: "Anahtar veya şifre hatalı" }, { status: 401 });
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createAdminSession({
    level: "sub",
    adminName: admin.name,
    adminUserId: admin.id,
    sessionVersion: admin.sessionVersion,
  });
  await writeAdminAudit({
    admin: {
      role: "admin",
      level: "sub",
      adminName: admin.name,
      adminUserId: admin.id,
      sessionVersion: admin.sessionVersion,
    },
    action: "LOGIN",
    entityType: "Admin",
    entityId: admin.id,
    summary: "Alt admin girişi",
    request,
  });
  return NextResponse.json({ ok: true, level: "sub" });
}

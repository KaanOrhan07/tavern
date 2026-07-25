import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { hashPassword, hashResetToken, validateOwnerPassword } from "@/lib/password";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(10),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`pw-reset-confirm:${ip}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
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

  const pwError = validateOwnerPassword(body.data.password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  const tokenHash = hashResetToken(body.data.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !record ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    !record.user.active ||
    record.user.role !== "OWNER"
  ) {
    return NextResponse.json(
      { error: "Sıfırlama bağlantısı geçersiz veya süresi dolmuş" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(body.data.password),
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    businessId: record.user.businessId,
    action: "SETTINGS_CHANGE",
    entityType: "User",
    entityId: record.userId,
    metadata: { event: "password_reset" },
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}

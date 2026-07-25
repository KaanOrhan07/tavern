import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/password";
import { logger } from "@/lib/logger";

const schema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
});

/**
 * Şifre sıfırlama isteği. Token hash DB'ye yazılır.
 * E-posta servisi yoksa token yalnızca sunucu loguna (redacted olmayan reset URL) yazılır — prod'da e-posta bağlanmalı.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`pw-reset:${ip}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla deneme, lütfen bekleyin" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  // Enumeration önleme: her zaman aynı cevap
  const okResponse = NextResponse.json({
    ok: true,
    message: "E-posta kayıtlıysa sıfırlama bağlantısı gönderildi",
  });

  if (!body.success) return okResponse;

  const business = await prisma.business.findUnique({
    where: { slug: body.data.slug },
  });
  if (!business) return okResponse;

  const user = await prisma.user.findFirst({
    where: {
      businessId: business.id,
      role: "OWNER",
      email: body.data.email,
      active: true,
    },
  });
  if (!user) return okResponse;

  const { token, tokenHash } = createResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${base}/panel/${business.slug}/sifre-sifirla?token=${token}`;

  // Prod'da e-posta sağlayıcısı bağlanmalı; şimdilik yapılandırılmış log
  logger.info("password_reset_token_created", {
    businessId: business.id,
    userId: user.id,
    route: "/api/panel/password-reset/request",
  });
  if (process.env.NODE_ENV !== "production") {
    logger.info("password_reset_dev_url", { resetUrl });
  }

  return okResponse;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Kalıcı Google yorum bağlantısı: /{işletme}/yorum
 * NFC kartı, masa QR'ı ve ödeme sonrası kart hep bu adresi kullanır; işletme Google linkini değiştirirse
 * basılı kartlar bozulmaz. Tıklama sayacı tutulur.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ isletmeSlug: string }> }
) {
  const { isletmeSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
    select: { id: true, active: true, googleReviewUrl: true },
  });
  if (!business || !business.active || !business.googleReviewUrl) {
    return NextResponse.redirect(new URL(`/${isletmeSlug}`, request.url));
  }

  // Sayaç şişirilmesin: aynı IP'den dakikada 5 sayım
  const limited = await rateLimitAsync(`review-click:${clientIp(request)}:${business.id}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (limited.ok) {
    await prisma.business.update({ where: { id: business.id }, data: { reviewClicks: { increment: 1 } } }).catch(() => undefined);
  }
  return NextResponse.redirect(business.googleReviewUrl, 302);
}

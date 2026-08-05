import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { attachReferralCode } from "@/lib/loyalty";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  slug: z.string().min(1),
  phone: z.string().min(10).max(20),
  referralCode: z.string().min(4).max(32),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`loyalty-referral:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { slug: body.data.slug } });
  if (!business || !business.active) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  try {
    await attachReferralCode(business.id, body.data.phone, body.data.referralCode);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Uygulanamadı" },
      { status: 400 }
    );
  }
}

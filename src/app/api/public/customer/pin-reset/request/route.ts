import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPinReset } from "@/lib/customer-auth";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";

const schema = z.object({ phone: z.string().min(10).max(20) });

/** PIN sıfırlama kodu ister (SMS). Hesap varlığı ifşa edilmez. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`pin-reset-req:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  try {
    const challenge = await requestPinReset(body.data.phone);
    return NextResponse.json({
      ok: true,
      challengeToken: challenge.challengeToken,
      debugOtp: challenge.debugOtp,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "İşlem başarısız" },
      { status: 400 }
    );
  }
}

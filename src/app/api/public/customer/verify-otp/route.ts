import { NextResponse } from "next/server";
import { z } from "zod";
import {
  confirmCustomerOtp,
  createCustomerSessionToken,
  setCustomerSessionCookie,
} from "@/lib/customer-auth";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";

const schema = z.object({
  phone: z.string().min(10).max(20),
  otp: z.string().regex(/^\d{6}$/),
  challengeToken: z.string().min(10),
  remember: z.boolean().optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`customer-otp:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  try {
    const remember = body.data.remember === true;
    const profile = await confirmCustomerOtp(body.data);
    const token = await createCustomerSessionToken(profile, remember);
    await setCustomerSessionCookie(token, remember);
    return NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        phone: profile.phone,
        fullName: profile.fullName,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Doğrulama başarısız" },
      { status: 400 }
    );
  }
}

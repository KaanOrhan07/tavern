import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCustomerSessionToken,
  registerCustomerProfile,
  setCustomerSessionCookie,
} from "@/lib/customer-auth";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  phone: z.string().min(10).max(20),
  pin: z.string().regex(/^\d{6}$/),
  fullName: z.string().min(2).max(80).optional(),
  email: z.string().email().max(120).optional().or(z.literal("")),
  remember: z.boolean().optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`customer-register:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  try {
    const result = await registerCustomerProfile({ ...body.data, email: body.data.email || undefined });
    await writeAuditLog({
      action: "CREATE",
      entityType: "CustomerProfile",
      entityId: result.profileId,
      // Telefon numarası KVKK gereği log'a yazılmaz
      ipAddress: ip,
    });
    // Doğrulama kodu kapalıysa hesap doğrudan açılır ve oturum başlar
    if (result.verified) {
      const remember = body.data.remember === true;
      const token = await createCustomerSessionToken({ id: result.profileId, phone: result.phone }, remember);
      await setCustomerSessionCookie(token, remember);
      return NextResponse.json({ ok: true, verified: true, profileId: result.profileId });
    }
    return NextResponse.json({
      ok: true,
      verified: false,
      profileId: result.profileId,
      challengeToken: result.challengeToken,
      debugOtp: result.debugOtp,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kayıt başarısız" },
      { status: 400 }
    );
  }
}

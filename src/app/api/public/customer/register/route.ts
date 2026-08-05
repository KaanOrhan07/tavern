import { NextResponse } from "next/server";
import { z } from "zod";
import { registerCustomerProfile } from "@/lib/customer-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  phone: z.string().min(10).max(20),
  pin: z.string().regex(/^\d{6}$/),
  fullName: z.string().min(2).max(80).optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`customer-register:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  try {
    const result = await registerCustomerProfile(body.data);
    await writeAuditLog({
      action: "CREATE",
      entityType: "CustomerProfile",
      entityId: result.profileId,
      afterData: { phone: result.phone },
      ipAddress: ip,
    });
    return NextResponse.json({
      ok: true,
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

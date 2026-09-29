import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmPinReset } from "@/lib/customer-auth";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  phone: z.string().min(10).max(20),
  otp: z.string().regex(/^\d{6}$/),
  challengeToken: z.string().min(10),
  newPin: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`pin-reset-confirm:${ip}`, { limit: 15, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  try {
    const profile = await confirmPinReset(body.data);
    await writeAuditLog({
      action: "UPDATE",
      entityType: "CustomerProfile",
      entityId: profile.id,
      metadata: { action: "pin_reset_self_service" },
      ipAddress: ip,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "İşlem başarısız" },
      { status: 400 }
    );
  }
}

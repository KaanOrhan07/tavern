import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ key: z.string().min(1) });

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`admin-login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
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
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || body.data.key !== adminKey) {
    return NextResponse.json({ error: "Geçersiz anahtar" }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}

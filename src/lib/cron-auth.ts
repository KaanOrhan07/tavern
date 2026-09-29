import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/crypto";

/** Cron uçları için ortak koruma: `Authorization: Bearer $CRON_SECRET`. Yetkisizse NextResponse döner. */
export function checkCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET tanımlı değil" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  return null;
}

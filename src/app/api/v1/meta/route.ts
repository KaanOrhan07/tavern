import { NextResponse } from "next/server";
import { API_VERSION, minAppVersions, serverVersion, upgradeRequired } from "@/lib/app-version";

/**
 * Herkese açık: masaüstü/mobil uygulamaların açılışta çağırdığı uyumluluk ve yapılandırma uç noktası.
 * Gizli değer içermez (Supabase anon anahtarı zaten tarayıcıya açıktır).
 */
export async function GET(request: Request) {
  return NextResponse.json(
    {
      ok: true,
      api: API_VERSION,
      server: serverVersion(),
      minAppVersion: minAppVersions(),
      upgradeRequired: upgradeRequired(request),
      auth: {
        login: "/api/v1/auth/login",
        scheme: "Bearer",
        header: "Authorization: Bearer <token>",
        tokenLifetimeDays: 90,
      },
      realtime: {
        provider: "supabase-broadcast",
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
        // Kanal adı: `${channelPrefix}${businessId}`; olaylar yalnızca "yenile" sinyalidir (veri taşımaz)
        channelPrefix: "tavern:",
      },
      capabilities: ["bearer-auth", "idempotency", "offline-queue", "print-agent", "realtime-ping"],
    },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}

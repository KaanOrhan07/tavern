import { after } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Supabase Realtime (Broadcast) — "yenile" sinyalleri.
 *
 * Güvenlik tasarımı: kanallar VERİ TAŞIMAZ. Olay yalnızca "orders değişti" gibi bir ipucudur; istemci
 * kendi oturumuyla (cookie/Bearer) ilgili API'den veriyi çeker. Yani anon anahtar + kanal adı bilen biri
 * hiçbir işletme verisi göremez (Postgres Changes kullanılmaz, tablolara RLS gerekmez).
 * Kanal: `tavern:<businessId>`. Realtime kapalıysa/başarısızsa istemciler polling ile çalışmaya devam eder.
 */
export type RealtimeEvent =
  | "orders" // sipariş/kalem değişti
  | "tables" // masa durumu değişti (ödeme, kapanış)
  | "notifications" // yeni bildirim (garson çağır, hesap, randevu)
  | "appointments"
  | "kitchen"
  | "print";

const TIMEOUT_MS = 2500;

async function send(businessId: string, event: RealtimeEvent) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic: `tavern:${businessId}`, event, payload: { t: Date.now() }, private: false }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) logger.warn("realtime_broadcast_failed", { status: res.status });
  } catch (err) {
    logger.warn("realtime_broadcast_error", { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * İşletme kanalına yenile sinyali gönderir. Yanıtı geciktirmez: istek kapsamındaysa `after()` ile,
 * değilse doğrudan (fire-and-forget) çalışır. Asla exception fırlatmaz.
 */
export function broadcastBusiness(businessId: string, ...events: RealtimeEvent[]) {
  const unique = [...new Set(events)];
  const run = async () => {
    for (const e of unique) await send(businessId, e);
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

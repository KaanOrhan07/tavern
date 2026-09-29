import { logger } from "@/lib/logger";
import { normalizePhone } from "@/lib/loyalty";

/**
 * Netgsm SMS istemcisi.
 * Ortam değişkenleri: NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_HEADER (onaylı başlık),
 * opsiyonel NETGSM_OTP_HEADER (OTP için ayrı başlık/paket kullanılıyorsa).
 * Yapılandırılmamışsa gönderim yapılmaz (dev'de mesaj loga düşer) — asla exception fırlatmaz.
 */
export type SmsCategory = "otp" | "transactional";
export type SmsResult = { ok: true; id?: string } | { ok: false; reason: string };

const ENDPOINT = "https://api.netgsm.com.tr/sms/send/get/";

const NETGSM_ERRORS: Record<string, string> = {
  "20": "mesaj metni hatalı/çok uzun",
  "30": "kullanıcı adı/şifre hatalı veya API erişimi kapalı",
  "40": "mesaj başlığı (sender) tanımlı değil",
  "50": "abone hesabı ile gönderim yetkisi yok",
  "51": "abone hesabı bulunamadı",
  "70": "hatalı parametre",
  "80": "gönderim sınır aşımı",
  "85": "mükerrer gönderim sınır aşımı",
};

export function isSmsConfigured() {
  return Boolean(
    process.env.NETGSM_USERCODE && process.env.NETGSM_PASSWORD && process.env.NETGSM_HEADER
  );
}

export async function sendSms(
  phone: string,
  message: string,
  category: SmsCategory = "transactional"
): Promise<SmsResult> {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, reason: "invalid_phone" };

  if (!isSmsConfigured()) {
    // Telefon ve içerik (OTP olabilir) prod loguna yazılmasın; sadece dev'de
    if (process.env.NODE_ENV !== "production") {
      logger.info("sms_not_configured_dev", { category, preview: message.slice(0, 80) });
    } else {
      logger.warn("sms_not_configured", { category });
    }
    return { ok: false, reason: "not_configured" };
  }

  const header =
    (category === "otp" && process.env.NETGSM_OTP_HEADER) || process.env.NETGSM_HEADER!;
  const params = new URLSearchParams({
    usercode: process.env.NETGSM_USERCODE!,
    password: process.env.NETGSM_PASSWORD!,
    gsmno: normalized.slice(1), // 05xx… → 5xx… (Netgsm 10 haneli kabul eder)
    message,
    msgheader: header,
    dil: "TR", // Türkçe karakter desteği
  });

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      signal: AbortSignal.timeout(10_000),
    });
    const text = (await res.text()).trim();
    const [code, id] = text.split(/\s+/);
    if (code === "00" || code === "01" || code === "02") return { ok: true, id };
    const reason = NETGSM_ERRORS[code ?? ""] ?? `netgsm_kod_${code}`;
    logger.error("sms_send_failed", { category, code, reason });
    return { ok: false, reason };
  } catch (err) {
    logger.error("sms_send_error", { category, error: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: "network_error" };
  }
}

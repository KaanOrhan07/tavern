import { logger } from "@/lib/logger";

/**
 * E-posta gönderimi — ücretsiz sağlayıcılar:
 *  - Brevo (önerilen): BREVO_API_KEY + EMAIL_FROM (Brevo'da doğrulanmış gönderen adresi). Günde 300 ücretsiz.
 *  - Resend: RESEND_API_KEY + EMAIL_FROM (doğrulanmış alan adı gerekir). Günde 100 ücretsiz.
 * EMAIL_FROM_NAME (opsiyonel) görünen ad, varsayılan "Tavern". Yapılandırılmamışsa gönderilmez; asla exception fırlatmaz.
 */
function provider(): "brevo" | "resend" | null {
  if (!process.env.EMAIL_FROM) return null;
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export function isEmailConfigured() {
  return provider() !== null;
}

function parseFrom(): { name: string; email: string } {
  const raw = process.env.EMAIL_FROM ?? "";
  // "Ad <adres@alan.com>" veya yalnızca adres
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || process.env.EMAIL_FROM_NAME || "Tavern", email: m[2]! };
  return { name: process.env.EMAIL_FROM_NAME || "Tavern", email: raw.trim() };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const p = provider();
  if (!p) {
    logger.warn("email_not_configured", { subject: input.subject });
    return { ok: false, reason: "not_configured" };
  }
  const from = parseFrom();
  try {
    const res =
      p === "brevo"
        ? await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": process.env.BREVO_API_KEY!,
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({
              sender: { name: from.name, email: from.email },
              to: [{ email: input.to }],
              subject: input.subject,
              textContent: input.text,
              ...(input.html ? { htmlContent: input.html } : {}),
            }),
            signal: AbortSignal.timeout(10_000),
          })
        : await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${from.name} <${from.email}>`,
              to: [input.to],
              subject: input.subject,
              text: input.text,
              html: input.html,
            }),
            signal: AbortSignal.timeout(10_000),
          });
    if (!res.ok) {
      logger.error("email_send_failed", { provider: p, status: res.status });
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    logger.error("email_send_error", { provider: p, error: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: "network_error" };
  }
}

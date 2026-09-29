import { logger } from "@/lib/logger";

/**
 * E-posta gönderimi (Resend HTTP API). RESEND_API_KEY + EMAIL_FROM (ör. "Tavern <no-reply@alanadin.com>").
 * Yapılandırılmamışsa gönderilmez; asla exception fırlatmaz.
 */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isEmailConfigured()) {
    logger.warn("email_not_configured", { subject: input.subject });
    return { ok: false, reason: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logger.error("email_send_failed", { status: res.status });
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    logger.error("email_send_error", { error: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: "network_error" };
  }
}

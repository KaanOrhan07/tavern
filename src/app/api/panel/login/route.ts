import { NextResponse } from "next/server";
import { createPanelSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { authenticatePanel, panelLoginSchema } from "@/lib/panel-login";

export async function POST(request: Request) {
  const body = panelLoginSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const result = await authenticatePanel(body.data, {
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent"),
    channel: "web",
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      {
        status: result.status,
        headers: result.retryAfterSec ? { "Retry-After": String(result.retryAfterSec) } : undefined,
      }
    );
  }

  await createPanelSession(result.session);
  return NextResponse.json({ ok: true, role: result.role, redirectPath: result.redirectPath });
}

import { NextResponse } from "next/server";
import { signPanelToken } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { authenticatePanel, panelLoginSchema } from "@/lib/panel-login";
import { getFeatureMap } from "@/lib/features";
import { upgradeRequired } from "@/lib/app-version";

/**
 * Native uygulama girişi (işletme sahibi: e-posta+şifre, personel: PIN).
 * Web ile aynı doğrulamayı kullanır; çerez yerine Bearer token döner.
 * Uygulamalarda varsayılan "beni hatırla" açıktır (90 gün); `remember:false` → 12 saat.
 */
export async function POST(request: Request) {
  if (upgradeRequired(request)) {
    return NextResponse.json(
      { error: "Uygulama sürümünüz eski, lütfen güncelleyin", upgradeRequired: true },
      { status: 426 }
    );
  }

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const body = panelLoginSchema.safeParse(raw ? { remember: true, ...raw } : null);
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const result = await authenticatePanel(body.data, {
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent"),
    channel: "app",
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

  const token = await signPanelToken(result.session);
  const features = await getFeatureMap(result.business.id);
  return NextResponse.json({
    ok: true,
    token,
    tokenType: "Bearer",
    expiresInSec: result.session.remember ? 90 * 24 * 3600 : 12 * 3600,
    user: { id: result.session.userId, name: result.session.name, role: result.role },
    business: result.business,
    features,
    realtimeChannel: `tavern:${result.business.id}`,
  });
}

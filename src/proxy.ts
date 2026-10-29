import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_COOKIE = "tavern_admin";
const PANEL_COOKIE = "tavern_session";

// /panel altında işletme slug'ı olmayan müşteri rotaları (utils.ts RESERVED_BUSINESS_SLUGS ile uyumlu)
const CUSTOMER_PANEL_SEGMENTS = new Set(["giris-yap", "kayit-ol", "hesabim", "pin-sifirla"]);
// Oturum açmadan erişilebilen işletme paneli alt yolları
const PUBLIC_PANEL_SUBPATHS = new Set(["/giris", "/sifre-sifirla"]);
// Oturum gerektirmeyen panel API uçları
const PUBLIC_PANEL_API = new Set([
  "/api/panel/login",
  "/api/panel/logout",
  "/api/panel/password-reset/request",
  "/api/panel/password-reset/confirm",
]);

/**
 * Native uygulamaların (Capacitor/Ionic webview, Electron, geliştirme) çağırabildiği kökenler.
 * Ek köken: APP_ALLOWED_ORIGINS (virgülle ayrılmış). Çerez (credentials) CORS ile PAYLAŞILMAZ;
 * native istemciler `Authorization: Bearer` kullanır.
 */
const DEFAULT_APP_ORIGINS = [
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "app://tavern",
];

function allowedAppOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const extra = (process.env.APP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_APP_ORIGINS, ...extra].includes(origin) ? origin : null;
}

function withCors(response: NextResponse, origin: string | null): NextResponse {
  const allowed = allowedAppOrigin(origin);
  if (!allowed) return response;
  response.headers.set("Access-Control-Allow-Origin", allowed);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Idempotency-Key, X-Tavern-App, X-Tavern-App-Version"
  );
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

async function verifyToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.AUTH_SECRET!)
    );
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Web çerezi ya da native uygulamanın `Authorization: Bearer` token'ı (cihaz anahtarları tvd_… hariç). */
function panelTokenOf(request: NextRequest): string | undefined {
  const fromCookie = request.cookies.get(PANEL_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer && !bearer.startsWith("tvd_") ? bearer : undefined;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const isAppApi = pathname.startsWith("/api/v1") || pathname.startsWith("/api/panel");

  // --- CORS ön kontrolü (preflight): kimlik doğrulamadan önce yanıtlanır ---
  if (request.method === "OPTIONS" && isAppApi) {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }

  // --- Admin sayfaları ---
  if (pathname.startsWith("/admin") && pathname !== "/admin/giris") {
    const session = await verifyToken(request.cookies.get(ADMIN_COOKIE)?.value);
    if (session?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/giris", request.url));
    }
  }

  // --- Admin API (login hariç) ---
  if (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login") {
    const session = await verifyToken(request.cookies.get(ADMIN_COOKIE)?.value);
    if (session?.role !== "admin") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
  }

  // --- Panel sayfaları: /panel/[slug]/... (giris hariç) ---
  const panelPageMatch = pathname.match(/^\/panel\/([^/]+)(\/.*)?$/);
  if (
    panelPageMatch &&
    panelPageMatch[2] &&
    !CUSTOMER_PANEL_SEGMENTS.has(panelPageMatch[1]) &&
    !PUBLIC_PANEL_SUBPATHS.has(panelPageMatch[2].replace(/\/$/, ""))
  ) {
    const session = await verifyToken(request.cookies.get(PANEL_COOKIE)?.value);
    const slug = decodeURIComponent(panelPageMatch[1]);
    if (!session || session.businessSlug !== slug) {
      return NextResponse.redirect(
        new URL(`/panel/${slug}/giris`, request.url)
      );
    }
  }

  // --- Panel API (login hariç): çerez VEYA Bearer token ---
  if (pathname.startsWith("/api/panel") && !PUBLIC_PANEL_API.has(pathname)) {
    const session = await verifyToken(panelTokenOf(request));
    if (!session || (session.role !== "owner" && session.role !== "staff")) {
      return withCors(NextResponse.json({ error: "Yetkisiz" }, { status: 401 }), origin);
    }
  }

  // /api/v1/*: kimlik doğrulama uç bazında yapılır (oturum, cihaz anahtarı veya herkese açık)
  return isAppApi ? withCors(NextResponse.next(), origin) : NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/panel/:path*",
    "/api/admin/:path*",
    "/api/panel/:path*",
    "/api/v1/:path*",
  ],
};

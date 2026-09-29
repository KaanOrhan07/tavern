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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // --- Panel API (login hariç) ---
  if (pathname.startsWith("/api/panel") && !PUBLIC_PANEL_API.has(pathname)) {
    const session = await verifyToken(request.cookies.get(PANEL_COOKIE)?.value);
    if (!session || (session.role !== "owner" && session.role !== "staff")) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/panel/:path*", "/api/admin/:path*", "/api/panel/:path*"],
};

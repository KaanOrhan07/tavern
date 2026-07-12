import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_COOKIE = "tavern_admin";
const PANEL_COOKIE = "tavern_session";

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
  if (panelPageMatch && panelPageMatch[2] && panelPageMatch[2] !== "/giris") {
    const session = await verifyToken(request.cookies.get(PANEL_COOKIE)?.value);
    const slug = decodeURIComponent(panelPageMatch[1]);
    if (!session || session.businessSlug !== slug) {
      return NextResponse.redirect(
        new URL(`/panel/${slug}/giris`, request.url)
      );
    }
  }

  // --- Panel API (login hariç) ---
  if (pathname.startsWith("/api/panel") && pathname !== "/api/panel/login" && pathname !== "/api/panel/logout") {
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

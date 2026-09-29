import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  destroyAdminSession,
  destroyPanelSession,
  getAdminSession,
  getPanelSession,
  type AdminSession,
  type PanelSession,
} from "@/lib/auth";
import type { Business } from "@/generated/prisma/client";

export type PanelContext = { session: PanelSession; business: Business };
export type AdminContext = { session: AdminSession };

/**
 * Admin API koruması. `superOnly`: sadece env ADMIN_KEY ile giren ana admin.
 * Alt adminlerde DB'deki aktiflik + sessionVersion her istekte doğrulanır.
 */
export async function requireAdmin(options?: {
  superOnly?: boolean;
}): Promise<AdminContext | NextResponse> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (session.level === "sub") {
    const admin = session.adminUserId
      ? await prisma.adminUser.findUnique({
          where: { id: session.adminUserId },
          select: { active: true, sessionVersion: true },
        })
      : null;
    if (!admin || !admin.active || admin.sessionVersion !== (session.sessionVersion ?? 1)) {
      await destroyAdminSession();
      return NextResponse.json({ error: "Oturum geçersiz" }, { status: 401 });
    }
  }
  if (options?.superOnly && session.level !== "super") {
    return NextResponse.json(
      { error: "Bu işlem yalnızca ana admin tarafından yapılabilir" },
      { status: 403 }
    );
  }
  return { session };
}

/**
 * Panel API uçları için ortak koruma: oturum + işletme aktiflik + sessionVersion.
 */
export async function requirePanel(options?: {
  ownerOnly?: boolean;
}): Promise<PanelContext | NextResponse> {
  const session = await getPanelSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (options?.ownerOnly && session.role !== "owner") {
    return NextResponse.json(
      { error: "Bu işlem için işletme sahibi yetkisi gerekir" },
      { status: 403 }
    );
  }

  const [business, user] = await Promise.all([
    prisma.business.findUnique({ where: { id: session.businessId } }),
    prisma.user.findFirst({
      where: { id: session.userId, businessId: session.businessId },
      select: { active: true, sessionVersion: true, role: true },
    }),
  ]);

  if (!business || !business.active) {
    return NextResponse.json({ error: "İşletme aktif değil" }, { status: 403 });
  }
  if (!user || !user.active) {
    await destroyPanelSession();
    return NextResponse.json({ error: "Oturum geçersiz" }, { status: 401 });
  }
  if (user.sessionVersion !== session.sessionVersion) {
    await destroyPanelSession();
    return NextResponse.json(
      { error: "Oturumunuz sonlandırıldı, tekrar giriş yapın" },
      { status: 401 }
    );
  }

  return { session, business };
}

export function isGuardError(
  result: PanelContext | AdminContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

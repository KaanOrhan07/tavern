import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPanelSession, type PanelSession } from "@/lib/auth";
import type { Business } from "@/generated/prisma/client";

export type PanelContext = { session: PanelSession; business: Business };

/**
 * Panel API uçları için ortak koruma: oturum + işletme aktiflik kontrolü.
 * Hata durumunda NextResponse döner, başarıda context döner.
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
  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
  });
  if (!business || !business.active) {
    return NextResponse.json(
      { error: "İşletme aktif değil" },
      { status: 403 }
    );
  }
  return { session, business };
}

export function isGuardError(
  result: PanelContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

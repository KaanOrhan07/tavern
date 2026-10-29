import { NextResponse } from "next/server";
import { requirePanel, isGuardError } from "@/lib/guard";
import { getBarberReports } from "@/lib/reports-barber";

// 3.1.0: berber randevu raporları (7 / 30 / 90 gün)
export async function GET(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;
  const days = Number(new URL(request.url).searchParams.get("days") ?? 7);
  const data = await getBarberReports(ctx.business.id, Number.isFinite(days) ? days : 7);
  return NextResponse.json(data);
}

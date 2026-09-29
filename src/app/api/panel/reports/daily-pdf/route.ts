import { NextResponse } from "next/server";
import { requirePanel, isGuardError } from "@/lib/guard";
import { getDailyReportData } from "@/lib/reports/daily-report";
import { buildDailyReportPdf } from "@/lib/reports/daily-pdf";
import { writeAuditLog } from "@/lib/audit";
import { todayYmdInTz } from "@/lib/business-timezone";

export const runtime = "nodejs";

/** Günlük rapor PDF'i: ciro, ürün satışları, personel bazlı sipariş, tahmini malzeme tüketimi. */
export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  try {
    const data = await getDailyReportData(ctx.business.id);
    const pdf = await buildDailyReportPdf(data);
    await writeAuditLog({
      businessId: ctx.business.id,
      session: ctx.session,
      action: "CREATE",
      entityType: "DailyReportPdf",
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tavern-gunluk-rapor-${todayYmdInTz()}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[daily-pdf]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Rapor oluşturulamadı" }, { status: 500 });
  }
}

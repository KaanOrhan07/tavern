import { NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/devices";
import { claimPrintJobs } from "@/lib/print-queue";

/**
 * Yazdırma ajanı: bekleyen işleri çeker (atomik olarak bu cihaza atanır).
 *   GET /api/v1/print/jobs?limit=10     Authorization: Bearer tvd_…
 * Yanıt: { jobs: [{ id, kind, printerKey, payload, attempt, createdAt }] }
 * Ajan her işi yazdırıp POST /api/v1/print/jobs/{id}/ack ile sonucu bildirir. 2 dk içinde ack gelmeyen iş
 * tekrar verilir (en fazla 5 deneme). Ajan ~2-3 sn aralıkla çağırabilir; ayrıca Realtime "print" ipucu dinleyebilir.
 */
export async function GET(request: Request) {
  const device = await authenticateDevice(request, ["PRINT_AGENT"]);
  if (device instanceof NextResponse) return device;

  const limit = Number.parseInt(new URL(request.url).searchParams.get("limit") ?? "10", 10);
  const jobs = await claimPrintJobs(device.businessId, device.deviceId, Number.isFinite(limit) ? limit : 10);
  return NextResponse.json({ ok: true, jobs, serverTime: new Date().toISOString() });
}

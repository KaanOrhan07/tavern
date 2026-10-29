import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/lib/devices";
import { ackPrintJob } from "@/lib/print-queue";

const schema = z.object({ ok: z.boolean(), error: z.string().max(300).optional() });

/** Yazdırma sonucu: { ok: true } → tamam; { ok: false, error } → hata (yeniden denenir, 5 denemede FAILED). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const device = await authenticateDevice(request, ["PRINT_AGENT"]);
  if (device instanceof NextResponse) return device;

  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const acked = await ackPrintJob({
    businessId: device.businessId,
    deviceId: device.deviceId,
    jobId: id,
    ok: body.data.ok,
    error: body.data.error,
  });
  if (!acked) return NextResponse.json({ error: "İş bulunamadı veya bu cihaza atanmamış" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

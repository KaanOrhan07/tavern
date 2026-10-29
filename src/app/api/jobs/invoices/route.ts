import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronAuth } from "@/lib/cron-auth";
import { getInvoiceProvider } from "@/lib/invoice/provider";

/** e-Arşiv kuyruğu: bekleyen fatura kayıtlarını bağlı entegratöre iletir. pg_cron ile 5-15 dk'da bir çağrılabilir. */
export async function POST(request: Request) {
  const denied = checkCronAuth(request);
  if (denied) return denied;

  const pending = await prisma.invoiceRecord.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  let sent = 0;
  let failed = 0;
  for (const rec of pending) {
    const provider = getInvoiceProvider(rec.provider);
    try {
      if (!provider) throw new Error(`Tanımsız entegratör: ${rec.provider}`);
      const payments = await prisma.payment.aggregate({
        where: { orderId: rec.orderId },
        _sum: { amountKurus: true },
      });
      const result = await provider.createInvoice({
        businessId: rec.businessId,
        orderId: rec.orderId,
        amountKurus: payments._sum.amountKurus ?? 0,
      });
      await prisma.invoiceRecord.update({
        where: { id: rec.id },
        data: { status: "SENT", externalId: result.externalId ?? result.id, pdfUrl: result.pdfUrl ?? null, error: null },
      });
      sent++;
    } catch (err) {
      await prisma.invoiceRecord.update({
        where: { id: rec.id },
        data: { status: "FAILED", error: (err instanceof Error ? err.message : "Bilinmeyen hata").slice(0, 300) },
      });
      failed++;
    }
  }
  return NextResponse.json({ ok: true, processed: pending.length, sent, failed });
}

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Yazdırma kuyruğu. Sipariş geldiğinde sunucu iş ekler; masaüstü yazdırma ajanı
 * (/api/v1/print/jobs) işi çekip ağ/USB yazıcıya basar ve sonucu bildirir.
 *
 * İş yükü sözleşmesi (payload):
 *  KITCHEN_TICKET: { orderId, tableName, createdAt (ISO), source: "WAITER"|"CUSTOMER", items: [{ name, quantity, note|null }] }
 *  RECEIPT:        { orderId, tableName, total, lines: [...] } (ileride)
 *  TEST:           { text }
 */
export type PrintKind = "KITCHEN_TICKET" | "RECEIPT" | "TEST";

export const MAX_ATTEMPTS = 5;
const STALE_CLAIM_MS = 2 * 60_000;

/** İşletmede aktif (iptal edilmemiş) bir yazdırma ajanı kayıtlıysa true. */
export async function hasPrintAgent(businessId: string): Promise<boolean> {
  const count = await prisma.deviceToken.count({
    where: { businessId, kind: "PRINT_AGENT", revokedAt: null },
  });
  return count > 0;
}

export async function enqueuePrintJob(input: {
  businessId: string;
  kind: PrintKind;
  payload: Prisma.InputJsonValue;
  printerKey?: string;
  /** true → ajan yoksa da kuyruğa ekle (test yazdırma) */
  force?: boolean;
}): Promise<string | null> {
  if (!input.force && !(await hasPrintAgent(input.businessId))) return null;
  const job = await prisma.printJob.create({
    data: {
      businessId: input.businessId,
      kind: input.kind,
      printerKey: input.printerKey ?? "kitchen",
      payload: input.payload,
    },
    select: { id: true },
  });
  return job.id;
}

/** Bekleyen (veya takılı kalmış) işleri atomik olarak bu cihaza atar. */
export async function claimPrintJobs(businessId: string, deviceId: string, limit: number) {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
  const eligible: Prisma.PrintJobWhereInput = {
    businessId,
    attempts: { lt: MAX_ATTEMPTS },
    OR: [{ status: "PENDING" }, { status: "PRINTING", claimedAt: { lt: staleBefore } }],
  };

  const candidates = await prisma.printJob.findMany({
    where: eligible,
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 20),
  });

  const claimed = [];
  for (const job of candidates) {
    // Aynı işi iki ajan almasın: koşullu güncelleme
    const res = await prisma.printJob.updateMany({
      where: { id: job.id, ...eligible },
      data: { status: "PRINTING", claimedAt: new Date(), claimedBy: deviceId, attempts: { increment: 1 } },
    });
    if (res.count === 1) {
      claimed.push({
        id: job.id,
        kind: job.kind,
        printerKey: job.printerKey,
        payload: job.payload,
        attempt: job.attempts + 1,
        createdAt: job.createdAt,
      });
    }
  }
  return claimed;
}

export async function ackPrintJob(input: {
  businessId: string;
  deviceId: string;
  jobId: string;
  ok: boolean;
  error?: string;
}): Promise<boolean> {
  const job = await prisma.printJob.findFirst({
    where: { id: input.jobId, businessId: input.businessId, claimedBy: input.deviceId, status: "PRINTING" },
    select: { id: true, attempts: true },
  });
  if (!job) return false;
  const exhausted = job.attempts >= MAX_ATTEMPTS;
  await prisma.printJob.update({
    where: { id: job.id },
    data: input.ok
      ? { status: "DONE", doneAt: new Date(), error: null }
      : { status: exhausted ? "FAILED" : "PENDING", error: (input.error ?? "Bilinmeyen hata").slice(0, 300), claimedAt: null },
  });
  return true;
}

export function kitchenTicketPayload(input: {
  orderId: string;
  tableName: string;
  source: "WAITER" | "CUSTOMER";
  items: { name: string; quantity: number; note?: string | null }[];
}): Prisma.InputJsonValue {
  return {
    orderId: input.orderId,
    tableName: input.tableName,
    createdAt: new Date().toISOString(),
    source: input.source,
    items: input.items.map((i) => ({ name: i.name, quantity: i.quantity, note: i.note ?? null })),
  };
}

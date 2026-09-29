import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const status = new URL(request.url).searchParams.get("status");
  const businesses = await prisma.business.findMany({
    include: {
      type: true,
      subscription: true,
    },
    orderBy: { name: "asc" },
  });

  const rows = businesses
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      active: b.active,
      type: b.type.name,
      paymentDueDay: b.subscription?.paymentDueDay ?? null,
      paymentStatus: b.subscription?.paymentStatus ?? "current",
      lastPaymentDate: b.subscription?.lastPaymentDate ?? null,
      nextPaymentDate: b.subscription?.nextPaymentDate ?? null,
      paymentWindowStart: b.subscription?.paymentWindowStart ?? null,
      paymentWindowDays: b.subscription?.paymentWindowDays ?? 7,
      monthlyFeeKurus: b.subscription?.monthlyFeeKurus ?? null,
      notes: b.subscription?.notes ?? null,
    }))
    .filter((r) => !status || r.paymentStatus === status)
    .sort((a, b) => {
      const rank = (s: string) => (s === "overdue" ? 0 : s === "pending" ? 1 : 2);
      return rank(a.paymentStatus) - rank(b.paymentStatus);
    });

  return NextResponse.json({ ok: true, businesses: rows });
}

const patchSchema = z.object({
  businessId: z.string().min(1),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  paymentStatus: z.enum(["current", "pending", "overdue"]).optional(),
  monthlyFeeKurus: z.number().int().min(0).nullable().optional(),
  nextPaymentDate: z.string().datetime().nullable().optional(),
  paymentWindowStart: z.string().datetime().nullable().optional(),
  paymentWindowDays: z.number().int().min(1).max(31).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const { businessId, ...rest } = body.data;
  const windowChanged = rest.paymentWindowStart !== undefined || rest.paymentWindowDays !== undefined;
  const data = {
    ...rest,
    nextPaymentDate:
      rest.nextPaymentDate === undefined
        ? undefined
        : rest.nextPaymentDate
          ? new Date(rest.nextPaymentDate)
          : null,
    paymentWindowStart:
      rest.paymentWindowStart === undefined
        ? undefined
        : rest.paymentWindowStart
          ? new Date(rest.paymentWindowStart)
          : null,
    // Pencere değişince bildirim durumu sıfırlanır (yeni pencere için tekrar bildirilsin)
    ...(windowChanged ? { businessNotifiedAt: null, adminNotifiedAt: null } : {}),
  };

  const subscription = await prisma.businessSubscription.upsert({
    where: { businessId },
    create: { businessId, ...data },
    update: data,
  });

  await writeAdminAudit({
    admin: ctx.session,
    businessId,
    action: "SETTINGS_CHANGE",
    entityType: "BusinessSubscription",
    entityId: businessId,
    summary: "Abonelik/ödeme bilgisi güncellendi",
    metadata: { changes: rest },
    request,
  });

  return NextResponse.json({ ok: true, subscription });
}

const paymentSchema = z.object({
  businessId: z.string().min(1),
  amountKurus: z.number().int().positive(),
  method: z.string().max(40).optional(),
  note: z.string().max(300).optional(),
  paidAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const body = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const paidAt = body.data.paidAt ? new Date(body.data.paidAt) : new Date();
  const record = await prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.create({
      data: {
        businessId: body.data.businessId,
        amountKurus: body.data.amountKurus,
        paidAt,
        recordedBy: ctx.session.adminUserId ?? "admin",
        method: body.data.method ?? null,
        note: body.data.note ?? null,
      },
    });
    const next = new Date(paidAt);
    next.setMonth(next.getMonth() + 1);
    const current = await tx.businessSubscription.findUnique({
      where: { businessId: body.data.businessId },
      select: { paymentWindowStart: true },
    });
    // Pencere tanımlıysa bir sonraki aya kaydır ve bildirim durumunu sıfırla
    let nextWindow: Date | null = null;
    if (current?.paymentWindowStart) {
      nextWindow = new Date(current.paymentWindowStart);
      while (nextWindow <= paidAt) nextWindow.setMonth(nextWindow.getMonth() + 1);
    }
    await tx.businessSubscription.upsert({
      where: { businessId: body.data.businessId },
      create: {
        businessId: body.data.businessId,
        paymentStatus: "current",
        lastPaymentDate: paidAt,
        nextPaymentDate: next,
      },
      update: {
        paymentStatus: "current",
        lastPaymentDate: paidAt,
        nextPaymentDate: next,
        ...(nextWindow
          ? { paymentWindowStart: nextWindow, businessNotifiedAt: null, adminNotifiedAt: null }
          : {}),
      },
    });
    return payment;
  });

  await writeAdminAudit({
    admin: ctx.session,
    businessId: body.data.businessId,
    action: "PAYMENT",
    entityType: "PaymentRecord",
    entityId: record.id,
    summary: `Ödeme kaydedildi: ${(record.amountKurus / 100).toFixed(2)} ₺`,
    request,
  });

  return NextResponse.json({ ok: true, payment: record });
}

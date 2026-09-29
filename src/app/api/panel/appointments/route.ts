import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isBarberBusiness } from "@/lib/business-modules";
import { getBarberSettings, transitionAppointment } from "@/lib/appointments";
import { addDaysYmd, todayYmdInTz, zonedLocalToUtc } from "@/lib/business-timezone";
import { STATUS_LABEL_TR } from "@/lib/appointment-status";

const CLOSED_STATUSES = [
  "REJECTED",
  "EXPIRED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_BUSINESS",
  "CANCELLED",
] as const;

export async function GET(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Bu modül bu işletme türü için geçerli değil" }, { status: 403 });
  }

  // Bugünün başlangıcı ve haftalık takvim için 8 gün öncesi (işletme saat diliminde)
  const todayStart = zonedLocalToUtc(todayYmdInTz(), "00:00");
  const since = new Date(todayStart.getTime() - 8 * 86_400_000);
  // Personel yalnızca KENDİ randevularını görür; sahip tüm işletmeyi görür
  const staffFilter = ctx.session.role === "staff" ? { staffId: ctx.session.userId } : {};

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: ctx.business.id,
      ...staffFilter,
      OR: [
        { startAt: { gte: since } },
        { status: "PENDING_BUSINESS_APPROVAL" },
        { status: "RESCHEDULE_PROPOSED" },
      ],
      status: { notIn: [...CLOSED_STATUSES] },
    },
    orderBy: { startAt: "asc" },
    include: {
      staff: { select: { id: true, name: true } },
      service: { select: { name: true, durationMinutes: true, priceKurus: true } },
    },
  });

  // Haftalık takvim: ?week=YYYY-MM-DD (haftanın Pazartesi'si) verilirse o haftanın randevuları
  let weekAppointments: typeof appointments | undefined;
  const week = new URL(request.url).searchParams.get("week");
  if (week && /^d{4}-d{2}-d{2}$/.test(week)) {
    weekAppointments = await prisma.appointment.findMany({
      where: {
        businessId: ctx.business.id,
        ...staffFilter,
        startAt: { gte: zonedLocalToUtc(week, "00:00"), lt: zonedLocalToUtc(addDaysYmd(week, 7), "00:00") },
        status: { notIn: [...CLOSED_STATUSES] },
      },
      orderBy: { startAt: "asc" },
      include: {
        staff: { select: { id: true, name: true } },
        service: { select: { name: true, durationMinutes: true, priceKurus: true } },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    appointments,
    weekAppointments,
    statusLabels: STATUS_LABEL_TR,
    role: ctx.session.role,
    todayStart: todayStart.toISOString(),
    settings: await getBarberSettings(ctx.business.id),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum([
    "approve",
    "reject",
    "propose_reschedule",
    "complete",
    "no_show",
    "cancel",
  ]),
  note: z.string().max(300).optional(),
  proposedStartAt: z.string().datetime().optional(),
  proposedEndAt: z.string().datetime().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Bu modül bu işletme türü için geçerli değil" }, { status: 403 });
  }

  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  // Personel yalnızca kendi randevuları üzerinde işlem yapabilir
  if (ctx.session.role === "staff") {
    const own = await prisma.appointment.findFirst({
      where: { id: body.data.id, businessId: ctx.business.id, staffId: ctx.session.userId },
      select: { id: true },
    });
    if (!own) return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
  }

  const map = {
    approve: "APPROVED",
    reject: "REJECTED",
    propose_reschedule: "RESCHEDULE_PROPOSED",
    complete: "COMPLETED",
    no_show: "NO_SHOW",
    cancel: "CANCELLED_BY_BUSINESS",
  } as const;

  try {
    const updated = await transitionAppointment({
      appointmentId: body.data.id,
      businessId: ctx.business.id,
      toStatus: map[body.data.action],
      changedById: ctx.session.userId,
      changedByRole: ctx.session.role,
      note: body.data.note,
      proposedStartAt: body.data.proposedStartAt
        ? new Date(body.data.proposedStartAt)
        : undefined,
      proposedEndAt: body.data.proposedEndAt ? new Date(body.data.proposedEndAt) : undefined,
      session: ctx.session,
    });
    return NextResponse.json({ ok: true, appointment: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "İşlem başarısız" },
      { status: 400 }
    );
  }
}

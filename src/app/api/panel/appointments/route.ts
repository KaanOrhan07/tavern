import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isBarberBusiness } from "@/lib/business-modules";
import { transitionAppointment } from "@/lib/appointments";
import { STATUS_LABEL_TR } from "@/lib/appointment-status";

export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Bu modül bu işletme türü için geçerli değil" }, { status: 403 });
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: ctx.business.id,
      OR: [
        { startAt: { gte: since } },
        { status: "PENDING_BUSINESS_APPROVAL" },
        { status: "RESCHEDULE_PROPOSED" },
      ],
      status: {
        notIn: ["REJECTED", "EXPIRED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_BUSINESS", "CANCELLED"],
      },
    },
    orderBy: { startAt: "asc" },
    include: {
      staff: { select: { name: true } },
      service: { select: { name: true, durationMinutes: true, priceKurus: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    appointments,
    statusLabels: STATUS_LABEL_TR,
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

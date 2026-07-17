import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isBarberBusiness } from "@/lib/business-modules";
import { archivePastAppointments } from "@/lib/appointments";

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

  await archivePastAppointments(ctx.business.id);

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: ctx.business.id,
      startAt: { gte: since },
      status: { in: ["BOOKED", "COMPLETED"] },
    },
    orderBy: { startAt: "asc" },
    include: {
      staff: { select: { name: true } },
      service: { select: { name: true, durationMinutes: true, priceKurus: true } },
    },
  });

  return NextResponse.json({ ok: true, appointments });
}

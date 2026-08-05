import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { transitionAppointment } from "@/lib/appointments";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  cancelToken: z.string().min(1),
  action: z.enum(["accept_reschedule", "reject_reschedule"]),
});

/** Müşteri alternatif saat önerisini kabul/red eder. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`appointment-respond:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: body.data.cancelToken },
  });
  if (!appointment || appointment.status !== "RESCHEDULE_PROPOSED") {
    return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
  }

  try {
    if (body.data.action === "accept_reschedule") {
      await transitionAppointment({
        appointmentId: appointment.id,
        businessId: appointment.businessId,
        toStatus: "RESCHEDULE_ACCEPTED",
        changedByRole: "customer",
        note: "Müşteri alternatif saati kabul etti",
        applyProposedTimes: true,
      });
    } else {
      await transitionAppointment({
        appointmentId: appointment.id,
        businessId: appointment.businessId,
        toStatus: "REJECTED",
        changedByRole: "customer",
        note: "Müşteri alternatif saati reddetti",
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "İşlem başarısız" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

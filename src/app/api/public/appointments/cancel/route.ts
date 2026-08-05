import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_CANCELLABLE } from "@/lib/appointment-status";
import { transitionAppointment } from "@/lib/appointments";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ cancelToken: z.string().min(1) });

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`appointment-cancel:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
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
  if (!appointment || !CUSTOMER_CANCELLABLE.includes(appointment.status)) {
    return NextResponse.json({ error: "Randevu bulunamadı veya iptal edilemez" }, { status: 404 });
  }

  if (appointment.startAt <= new Date()) {
    return NextResponse.json({ error: "Geçmiş randevu iptal edilemez" }, { status: 400 });
  }

  try {
    await transitionAppointment({
      appointmentId: appointment.id,
      businessId: appointment.businessId,
      toStatus: "CANCELLED_BY_CUSTOMER",
      changedByRole: "customer",
      note: "Müşteri iptal etti",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "İptal edilemedi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

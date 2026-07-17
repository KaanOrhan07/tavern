import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ cancelToken: z.string().min(1) });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: body.data.cancelToken },
  });
  if (!appointment || appointment.status !== "BOOKED") {
    return NextResponse.json({ error: "Randevu bulunamadı veya iptal edilemez" }, { status: 404 });
  }

  if (appointment.startAt <= new Date()) {
    return NextResponse.json({ error: "Geçmiş randevu iptal edilemez" }, { status: 400 });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}

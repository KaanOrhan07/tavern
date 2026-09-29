import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isBarberBusiness } from "@/lib/business-modules";

function parseHm(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const schema = z
  .object({
    slotMinutes: z.number().int().min(5).max(180),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    responseTimeoutMinutes: z
      .union([z.literal(30), z.literal(60), z.literal(180), z.literal(720)])
      .optional()
      .default(60),
    workDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "En az bir çalışma günü seçin")
      .max(7)
      .transform((d) => [...new Set(d)])
      .optional()
      .default([1, 2, 3, 4, 5, 6, 0]),
  })
  .refine((d) => parseHm(d.openTime) < parseHm(d.closeTime), {
    message: "Açılış saati kapanıştan önce olmalı",
  })
  .refine(
    (d) => parseHm(d.closeTime) - parseHm(d.openTime) >= d.slotMinutes,
    { message: "Slot süresi çalışma aralığından kısa olamaz" }
  );

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    include: { type: true, barberSettings: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Bu modül bu işletme türü için geçerli değil" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    settings: business.barberSettings ?? {
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "20:00",
      responseTimeoutMinutes: 60,
      workDays: [1, 2, 3, 4, 5, 6, 0],
    },
  });
}

export async function PATCH(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Bu modül bu işletme türü için geçerli değil" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz ayarlar" },
      { status: 400 }
    );
  }

  const settings = await prisma.barberSettings.upsert({
    where: { businessId: ctx.business.id },
    create: { businessId: ctx.business.id, ...body.data },
    update: body.data,
  });

  return NextResponse.json({ ok: true, settings });
}

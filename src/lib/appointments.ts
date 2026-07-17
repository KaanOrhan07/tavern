import { prisma } from "@/lib/prisma";

export type BarberSettingsData = {
  slotMinutes: number;
  openTime: string;
  closeTime: string;
};

function parseHm(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function atLocalMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getBarberSettings(businessId: string): Promise<BarberSettingsData> {
  const row = await prisma.barberSettings.findUnique({ where: { businessId } });
  return {
    slotMinutes: row?.slotMinutes ?? 30,
    openTime: row?.openTime ?? "09:00",
    closeTime: row?.closeTime ?? "20:00",
  };
}

/** Kapanış + 2 saat geçmiş günlerin randevularını arşivler. */
export async function archivePastAppointments(businessId: string) {
  const settings = await getBarberSettings(businessId);
  const closeMin = parseHm(settings.closeTime);
  const now = new Date();

  const booked = await prisma.appointment.findMany({
    where: { businessId, status: "BOOKED" },
    select: { id: true, startAt: true },
  });

  const toComplete = booked.filter((a) => {
    const dayStart = startOfLocalDay(a.startAt);
    const archiveAfter = atLocalMinutes(dayStart, closeMin + 120);
    return now >= archiveAfter;
  });

  if (toComplete.length === 0) return;

  await prisma.appointment.updateMany({
    where: { id: { in: toComplete.map((a) => a.id) } },
    data: { status: "COMPLETED" },
  });
}

function generateSlotStarts(day: Date, settings: BarberSettingsData): Date[] {
  const open = parseHm(settings.openTime);
  const close = parseHm(settings.closeTime);
  const slots: Date[] = [];
  for (let m = open; m < close; m += settings.slotMinutes) {
    slots.push(atLocalMinutes(day, m));
  }
  return slots;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export async function getAvailableSlots(params: {
  businessId: string;
  serviceId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
}) {
  await archivePastAppointments(params.businessId);

  const [settings, service, existing] = await Promise.all([
    getBarberSettings(params.businessId),
    prisma.service.findFirst({
      where: { id: params.serviceId, businessId: params.businessId, active: true },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: params.businessId,
        staffId: params.staffId,
        status: "BOOKED",
        startAt: {
          gte: new Date(`${params.date}T00:00:00`),
          lt: new Date(`${params.date}T23:59:59.999`),
        },
      },
    }),
  ]);

  if (!service) return [];

  const day = new Date(`${params.date}T12:00:00`);
  const slotStarts = generateSlotStarts(day, settings);
  const neededSlots = Math.ceil(service.durationMinutes / settings.slotMinutes);
  const closeMin = parseHm(settings.closeTime);
  const available: { startAt: string; endAt: string }[] = [];

  for (let i = 0; i <= slotStarts.length - neededSlots; i++) {
    const startAt = slotStarts[i]!;
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
    const endMin = startAt.getHours() * 60 + startAt.getMinutes() + service.durationMinutes;
    if (endMin > closeMin) continue;

    const conflict = existing.some((a) => overlaps(startAt, endAt, a.startAt, a.endAt));
    if (!conflict && startAt > new Date()) {
      available.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    }
  }

  return available;
}

export async function deductServiceStock(businessId: string, serviceId: string) {
  const items = await prisma.serviceRecipeItem.findMany({
    where: { serviceId, service: { businessId } },
  });
  for (const item of items) {
    await prisma.ingredient.update({
      where: { id: item.ingredientId },
      data: { quantity: { decrement: item.amount } },
    });
  }
}

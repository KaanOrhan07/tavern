import { prisma } from "@/lib/prisma";
import {
  DEFAULT_BUSINESS_TZ,
  addDaysYmd,
  formatDateInTz,
  minutesToHm,
  zonedLocalToUtc,
} from "@/lib/business-timezone";

export type BarberSettingsData = {
  slotMinutes: number;
  openTime: string;
  closeTime: string;
};

function parseHm(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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
    const dateYmd = formatDateInTz(a.startAt, DEFAULT_BUSINESS_TZ);
    const archiveAfter = zonedLocalToUtc(dateYmd, minutesToHm(closeMin + 120));
    return now >= archiveAfter;
  });

  if (toComplete.length === 0) return;

  await prisma.appointment.updateMany({
    where: { id: { in: toComplete.map((a) => a.id) } },
    data: { status: "COMPLETED" },
  });
}

function generateSlotStarts(dateYmd: string, settings: BarberSettingsData): Date[] {
  const open = parseHm(settings.openTime);
  const close = parseHm(settings.closeTime);
  const slots: Date[] = [];
  for (let m = open; m < close; m += settings.slotMinutes) {
    slots.push(zonedLocalToUtc(dateYmd, minutesToHm(m)));
  }
  return slots;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export type AvailableSlot = {
  startAt: string;
  endAt: string;
  label: string;
};

export async function getAvailableSlots(params: {
  businessId: string;
  serviceId: string;
  staffId: string;
  date: string; // YYYY-MM-DD (işletme takvim günü)
}): Promise<AvailableSlot[]> {
  await archivePastAppointments(params.businessId);

  const dayStart = zonedLocalToUtc(params.date, "00:00");
  const dayEnd = zonedLocalToUtc(addDaysYmd(params.date, 1), "00:00");

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
        startAt: { gte: dayStart, lt: dayEnd },
      },
    }),
  ]);

  if (!service) return [];

  const openMin = parseHm(settings.openTime);
  const closeMin = parseHm(settings.closeTime);
  const slotStarts = generateSlotStarts(params.date, settings);
  const neededSlots = Math.ceil(service.durationMinutes / settings.slotMinutes);
  const available: AvailableSlot[] = [];
  const now = new Date();

  for (let i = 0; i <= slotStarts.length - neededSlots; i++) {
    const startAt = slotStarts[i]!;
    const startMin = openMin + i * settings.slotMinutes;
    const endMin = startMin + service.durationMinutes;
    if (endMin > closeMin) continue;

    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
    const conflict = existing.some((a) => overlaps(startAt, endAt, a.startAt, a.endAt));
    if (!conflict && startAt > now) {
      available.push({
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        label: minutesToHm(startMin),
      });
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

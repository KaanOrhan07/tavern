import { prisma } from "@/lib/prisma";
import type { AppointmentStatus, Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_BUSINESS_TZ,
  addDaysYmd,
  formatDateInTz,
  minutesToHm,
  zonedLocalToUtc,
} from "@/lib/business-timezone";
import { CONFLICT_STATUSES, canTransition } from "@/lib/appointment-status";
import { writeAuditLog } from "@/lib/audit";
import type { PanelSession } from "@/lib/auth";
import { earnLoyaltyPoints } from "@/lib/loyalty";
import { isFeatureEnabled } from "@/lib/features";
import { upsertCustomerBusinessStats } from "@/lib/customer-stats";

export type BarberSettingsData = {
  slotMinutes: number;
  openTime: string;
  closeTime: string;
  responseTimeoutMinutes: number;
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
    responseTimeoutMinutes: row?.responseTimeoutMinutes ?? 60,
  };
}

/**
 * Kapanış + 2 saat geçmiş onaylı randevuları toplu tamamlar.
 * Okuma yollarında çağrılmaz — cron / jobs üzerinden çalıştırılır.
 */
export async function archivePastAppointments(businessId: string): Promise<number> {
  const settings = await getBarberSettings(businessId);
  const closeMin = parseHm(settings.closeTime);
  const now = new Date();

  const active = await prisma.appointment.findMany({
    where: {
      businessId,
      status: { in: CONFLICT_STATUSES },
    },
    select: {
      id: true,
      startAt: true,
      status: true,
      customerPhone: true,
      service: { select: { priceKurus: true } },
    },
  });

  const toComplete = active.filter((a) => {
    const dateYmd = formatDateInTz(a.startAt, DEFAULT_BUSINESS_TZ);
    const archiveAfter = zonedLocalToUtc(dateYmd, minutesToHm(closeMin + 120));
    return now >= archiveAfter;
  });

  if (toComplete.length === 0) return 0;

  const ids = toComplete.map((a) => a.id);
  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { id: { in: ids } },
      data: { status: "COMPLETED" },
    }),
    prisma.appointmentStatusHistory.createMany({
      data: toComplete.map((a) => ({
        appointmentId: a.id,
        fromStatus: a.status,
        toStatus: "COMPLETED" as const,
        changedByRole: "system",
        note: "Gün sonu otomatik arşiv",
      })),
    }),
  ]);

  await Promise.allSettled(
    toComplete.map((a) =>
      upsertCustomerBusinessStats({
        phone: a.customerPhone,
        businessId,
        kind: "appointment",
        spentKurus: a.service.priceKurus,
      })
    )
  );

  if (await isFeatureEnabled(businessId, "loyalty_points")) {
    await Promise.allSettled(
      toComplete.map((a) =>
        prisma.$transaction((tx) =>
          earnLoyaltyPoints(tx, {
            businessId,
            phone: a.customerPhone,
            spentKurus: a.service.priceKurus,
            sourceType: "appointment_completed",
            sourceEntityId: a.id,
          })
        )
      )
    );
  }

  return ids.length;
}

/** Tüm berber işletmelerinde gün sonu arşivi (cron). */
export async function archiveAllPastAppointments(): Promise<number> {
  const rows = await prisma.barberSettings.findMany({ select: { businessId: true } });
  let total = 0;
  for (const row of rows) {
    total += await archivePastAppointments(row.businessId);
  }
  return total;
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
  date: string;
}): Promise<AvailableSlot[]> {
  const dayStart = zonedLocalToUtc(params.date, "00:00");
  const dayEnd = zonedLocalToUtc(addDaysYmd(params.date, 1), "00:00");

  const [settings, service, existing, exceptions] = await Promise.all([
    getBarberSettings(params.businessId),
    prisma.service.findFirst({
      where: { id: params.serviceId, businessId: params.businessId, active: true },
      select: { id: true, durationMinutes: true },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: params.businessId,
        staffId: params.staffId,
        status: { in: CONFLICT_STATUSES },
        startAt: { gte: dayStart, lt: dayEnd },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.availabilityException.findMany({
      where: {
        businessId: params.businessId,
        date: dayStart,
        OR: [{ staffId: null }, { staffId: params.staffId }],
      },
      select: { allDay: true, startTime: true, endTime: true },
    }),
  ]);

  if (!service) return [];
  if (exceptions.some((e) => e.allDay)) return [];

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

    const blockedByException = exceptions.some((e) => {
      if (e.allDay || !e.startTime || !e.endTime) return false;
      const exStart = zonedLocalToUtc(params.date, e.startTime);
      const exEnd = zonedLocalToUtc(params.date, e.endTime);
      return overlaps(startAt, endAt, exStart, exEnd);
    });
    if (blockedByException) continue;

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
    select: { ingredientId: true, amount: true },
  });
  if (items.length === 0) return;
  const byIngredient = new Map<string, number>();
  for (const item of items) {
    byIngredient.set(item.ingredientId, (byIngredient.get(item.ingredientId) ?? 0) + item.amount);
  }
  await Promise.all(
    [...byIngredient].map(([ingredientId, amount]) =>
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: { quantity: { decrement: amount } },
      })
    )
  );
}

type TransitionParams = {
  appointmentId: string;
  businessId: string;
  toStatus: AppointmentStatus;
  changedById?: string | null;
  changedByRole?: string | null;
  note?: string | null;
  proposedStartAt?: Date | null;
  proposedEndAt?: Date | null;
  session?: PanelSession | null;
  applyProposedTimes?: boolean;
};

export async function transitionAppointment(params: TransitionParams) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: params.appointmentId, businessId: params.businessId },
    include: { service: true, staff: { select: { name: true } } },
  });
  if (!appointment) throw new Error("Randevu bulunamadı");
  if (!canTransition(appointment.status, params.toStatus)) {
    throw new Error(`Geçersiz durum geçişi: ${appointment.status} → ${params.toStatus}`);
  }

  const data: Prisma.AppointmentUpdateInput = {
    status: params.toStatus,
    statusNote: params.note ?? appointment.statusNote,
  };

  if (params.toStatus === "RESCHEDULE_PROPOSED") {
    if (!params.proposedStartAt || !params.proposedEndAt) {
      throw new Error("Alternatif saat gerekli");
    }
    data.proposedStartAt = params.proposedStartAt;
    data.proposedEndAt = params.proposedEndAt;
  }

  if (
    params.toStatus === "RESCHEDULE_ACCEPTED" ||
    (params.applyProposedTimes && appointment.proposedStartAt && appointment.proposedEndAt)
  ) {
    if (appointment.proposedStartAt && appointment.proposedEndAt) {
      data.startAt = appointment.proposedStartAt;
      data.endAt = appointment.proposedEndAt;
      data.proposedStartAt = null;
      data.proposedEndAt = null;
    }
  }

  if (params.toStatus === "APPROVED" || params.toStatus === "RESCHEDULE_ACCEPTED") {
    data.expiresAt = null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointment.update({
      where: { id: appointment.id },
      data,
    });
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        fromStatus: appointment.status,
        toStatus: params.toStatus,
        changedById: params.changedById ?? null,
        changedByRole: params.changedByRole ?? null,
        note: params.note ?? null,
      },
    });
    return row;
  });

  await writeAuditLog({
    businessId: params.businessId,
    session: params.session,
    action: "UPDATE",
    entityType: "Appointment",
    entityId: appointment.id,
    beforeData: { status: appointment.status },
    afterData: { status: params.toStatus, note: params.note },
  });

  // Stok yalnızca ilk kesinleşmede düşülür (onay veya bekleyen alternatif kabul)
  const firstConfirm =
    (params.toStatus === "APPROVED" || params.toStatus === "RESCHEDULE_ACCEPTED") &&
    (appointment.status === "PENDING_BUSINESS_APPROVAL" ||
      appointment.status === "RESCHEDULE_PROPOSED");
  if (firstConfirm && (await isFeatureEnabled(params.businessId, "stock"))) {
    await deductServiceStock(params.businessId, appointment.serviceId);
  }

  if (params.toStatus === "COMPLETED") {
    await upsertCustomerBusinessStats({
      phone: appointment.customerPhone,
      businessId: params.businessId,
      kind: "appointment",
      spentKurus: appointment.service.priceKurus,
      customerProfileId: appointment.customerProfileId,
    });
    if (await isFeatureEnabled(params.businessId, "loyalty_points")) {
      await prisma.$transaction(async (tx) => {
        await earnLoyaltyPoints(tx, {
          businessId: params.businessId,
          phone: appointment.customerPhone,
          spentKurus: appointment.service.priceKurus,
          sourceType: "appointment_completed",
          sourceEntityId: appointment.id,
        });
      });
    }
  }

  const notifType =
    params.toStatus === "APPROVED" || params.toStatus === "RESCHEDULE_ACCEPTED"
      ? "APPOINTMENT_APPROVED"
      : params.toStatus === "REJECTED"
        ? "APPOINTMENT_REJECTED"
        : params.toStatus === "RESCHEDULE_PROPOSED"
          ? "APPOINTMENT_RESCHEDULE"
          : params.toStatus === "EXPIRED"
            ? "APPOINTMENT_EXPIRED"
            : null;

  if (notifType) {
    await prisma.notification.create({
      data: {
        businessId: params.businessId,
        type: notifType,
        message: `${appointment.staff.name}: ${appointment.service.name} — ${appointment.customerName} → ${params.toStatus}`,
      },
    });
  }

  return updated;
}

/** Süresi dolan onay bekleyen talepleri toplu expired yapar. */
export async function expirePendingAppointments() {
  const now = new Date();
  const pending = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING_BUSINESS_APPROVAL", "RESCHEDULE_PROPOSED"] },
      expiresAt: { lte: now },
    },
    select: { id: true, businessId: true, status: true },
  });
  if (pending.length === 0) return 0;

  const ids = pending.map((a) => a.id);
  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED" },
    }),
    prisma.appointmentStatusHistory.createMany({
      data: pending.map((a) => ({
        appointmentId: a.id,
        fromStatus: a.status,
        toStatus: "EXPIRED" as const,
        changedByRole: "system",
        note: "Yanıt süresi doldu",
      })),
    }),
    prisma.notification.createMany({
      data: pending.map((a) => ({
        businessId: a.businessId,
        type: "APPOINTMENT_EXPIRED" as const,
        message: "Randevu talebinin yanıt süresi doldu",
      })),
    }),
  ]);
  return pending.length;
}

/** 30 dk kala hatırlatma (panel-içi bildirim). */
export async function sendAppointmentReminders() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60_000);
  const in31 = new Date(now.getTime() + 31 * 60_000);

  const upcoming = await prisma.appointment.findMany({
    where: {
      status: { in: CONFLICT_STATUSES },
      reminderSentAt: null,
      startAt: { gte: in30, lt: in31 },
    },
    select: {
      id: true,
      businessId: true,
      customerName: true,
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });
  if (upcoming.length === 0) return 0;

  await prisma.$transaction([
    prisma.notification.createMany({
      data: upcoming.map((a) => ({
        businessId: a.businessId,
        type: "APPOINTMENT_REMINDER" as const,
        message: `30 dk: ${a.staff.name} — ${a.service.name} (${a.customerName})`,
      })),
    }),
    prisma.appointment.updateMany({
      where: { id: { in: upcoming.map((a) => a.id) } },
      data: { reminderSentAt: now },
    }),
  ]);
  return upcoming.length;
}

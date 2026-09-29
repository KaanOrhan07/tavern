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
import { sendSms } from "@/lib/sms";
import { ALL_WORK_DAYS, weekdayOfYmd } from "@/lib/appointments-shared";

export { ALL_WORK_DAYS, weekdayOfYmd };

export type BarberSettingsData = {
  slotMinutes: number;
  openTime: string;
  closeTime: string;
  responseTimeoutMinutes: number;
  /** Çalışılan günler: 0=Pazar … 6=Cumartesi */
  workDays: number[];
};

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: DEFAULT_BUSINESS_TZ,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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
    workDays: row?.workDays?.length ? row.workDays : ALL_WORK_DAYS,
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
  // Kapalı gün: UI engeline ek olarak sunucu tarafında da uygulanır
  if (!settings.workDays.includes(weekdayOfYmd(params.date))) return [];
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
    include: {
      service: true,
      staff: { select: { name: true } },
      business: { select: { name: true } },
    },
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

  // Çift rezervasyon koruması: bekleyen talepler slotu bloklamadığı için aynı saate birden fazla
  // talep gelebilir; kesinleşme (onay / alternatif saat) anında personelin çakışması kontrol edilir.
  if (
    params.toStatus === "APPROVED" ||
    params.toStatus === "RESCHEDULE_ACCEPTED" ||
    params.toStatus === "RESCHEDULE_PROPOSED"
  ) {
    const useProposed =
      params.toStatus === "RESCHEDULE_PROPOSED"
        ? false
        : (params.toStatus === "RESCHEDULE_ACCEPTED" || params.applyProposedTimes) &&
          appointment.proposedStartAt &&
          appointment.proposedEndAt;
    const effStart =
      params.toStatus === "RESCHEDULE_PROPOSED"
        ? params.proposedStartAt!
        : useProposed
          ? appointment.proposedStartAt!
          : appointment.startAt;
    const effEnd =
      params.toStatus === "RESCHEDULE_PROPOSED"
        ? params.proposedEndAt!
        : useProposed
          ? appointment.proposedEndAt!
          : appointment.endAt;
    if (params.toStatus === "RESCHEDULE_PROPOSED" && (!effStart || !effEnd)) {
      throw new Error("Alternatif saat gerekli");
    }
    const clash = await prisma.appointment.findFirst({
      where: {
        businessId: params.businessId,
        staffId: appointment.staffId,
        id: { not: appointment.id },
        status: { in: CONFLICT_STATUSES },
        startAt: { lt: effEnd },
        endAt: { gt: effStart },
      },
      select: { customerName: true, startAt: true },
    });
    if (clash) {
      throw new Error(
        `Bu saatte ${appointment.staff.name} için başka bir onaylı randevu var (${clash.customerName}, ${formatWhen(clash.startAt)}). Reddedin veya alternatif saat önerin.`
      );
    }
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
        targetUserId: appointment.staffId,
        message: `${appointment.staff.name}: ${appointment.service.name} — ${appointment.customerName} → ${params.toStatus}`,
      },
    });
  }

  // Müşteriye SMS: yalnızca işletme/personel/sistem kaynaklı değişimlerde (müşterinin kendi eylemi için değil)
  if (params.changedByRole !== "customer") {
    const who = `${appointment.business.name} — ${appointment.staff.name}`;
    const when = formatWhen(updated.startAt);
    let sms: string | null = null;
    if (params.toStatus === "APPROVED" || params.toStatus === "RESCHEDULE_ACCEPTED") {
      sms = `Randevunuz onaylanmıştır. ${who} — ${when}`;
    } else if (params.toStatus === "REJECTED") {
      sms = `Randevunuz reddedilmiştir. Farklı bir saat için randevu almayı deneyiniz. ${who}`;
    } else if (params.toStatus === "RESCHEDULE_PROPOSED" && params.proposedStartAt) {
      sms = `${appointment.business.name} randevunuz için yeni bir saat önerdi: ${formatWhen(params.proposedStartAt)} (${appointment.staff.name}). Yanıtlamak için randevu sayfanızı açın.`;
    } else if (params.toStatus === "CANCELLED_BY_BUSINESS") {
      sms = `Randevunuz işletme tarafından iptal edilmiştir. ${who} — ${when}`;
    }
    if (sms) await sendSms(appointment.customerPhone, sms, "transactional");
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
    select: {
      id: true,
      businessId: true,
      status: true,
      customerPhone: true,
      business: { select: { name: true } },
    },
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
  await Promise.allSettled(
    pending.map((a) =>
      sendSms(
        a.customerPhone,
        `${a.business.name} randevu talebinize zamanında yanıt veremedi. Farklı bir saat için tekrar randevu almayı deneyiniz.`,
        "transactional"
      )
    )
  );
  return pending.length;
}

/**
 * Randevuya 1 saat kala MÜŞTERİYE SMS + ilgili personele panel bildirimi.
 * Cron her 5 dakikada çalışır; `reminderSentAt` ile tekrar gönderim engellenir.
 * Son dakika alınan randevular (<65 dk önceden onaylanan) için ayrıca hatırlatma yapılmaz.
 */
export async function sendAppointmentReminders() {
  const now = new Date();
  const in60 = new Date(now.getTime() + 60 * 60_000);

  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: CONFLICT_STATUSES },
      reminderSentAt: null,
      startAt: { gt: now, lte: in60 },
    },
    select: {
      id: true,
      businessId: true,
      staffId: true,
      customerName: true,
      customerPhone: true,
      startAt: true,
      createdAt: true,
      business: { select: { name: true } },
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });
  const upcoming = candidates.filter(
    (a) => a.startAt.getTime() - a.createdAt.getTime() >= 65 * 60_000
  );
  const skipped = candidates.filter((a) => !upcoming.includes(a));

  // Son dakika kayıtlarını da işaretle ki her turda tekrar taranmasınlar
  if (skipped.length) {
    await prisma.appointment.updateMany({
      where: { id: { in: skipped.map((a) => a.id) } },
      data: { reminderSentAt: now },
    });
  }
  if (upcoming.length === 0) return 0;

  await prisma.$transaction([
    prisma.notification.createMany({
      data: upcoming.map((a) => ({
        businessId: a.businessId,
        type: "APPOINTMENT_REMINDER" as const,
        targetUserId: a.staffId,
        message: `1 saat sonra: ${a.service.name} — ${a.customerName} (${formatWhen(a.startAt)})`,
      })),
    }),
    prisma.appointment.updateMany({
      where: { id: { in: upcoming.map((a) => a.id) } },
      data: { reminderSentAt: now },
    }),
  ]);

  await Promise.allSettled(
    upcoming.map((a) =>
      sendSms(
        a.customerPhone,
        `${a.business.name}'a 1 saat sonra randevunuz var — ${a.staff.name}, ${formatWhen(a.startAt).split(" ").slice(-1)[0]}`,
        "transactional"
      )
    )
  );
  return upcoming.length;
}

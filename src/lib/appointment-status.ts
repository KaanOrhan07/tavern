import type { AppointmentStatus } from "@/generated/prisma/client";

/** Slot çakışması için kesinleşmiş durumlar */
export const CONFLICT_STATUSES: AppointmentStatus[] = [
  "APPROVED",
  "RESCHEDULE_ACCEPTED",
  "BOOKED", // legacy
];

/** Müşterinin iptal edebileceği durumlar */
export const CUSTOMER_CANCELLABLE: AppointmentStatus[] = [
  "PENDING_BUSINESS_APPROVAL",
  "APPROVED",
  "RESCHEDULE_PROPOSED",
  "RESCHEDULE_ACCEPTED",
  "BOOKED",
];

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING_BUSINESS_APPROVAL: [
    "APPROVED",
    "REJECTED",
    "RESCHEDULE_PROPOSED",
    "EXPIRED",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_BUSINESS",
  ],
  APPROVED: [
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_BUSINESS",
    "RESCHEDULE_PROPOSED",
  ],
  RESCHEDULE_PROPOSED: [
    "RESCHEDULE_ACCEPTED",
    "REJECTED",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_BUSINESS",
    "EXPIRED",
  ],
  RESCHEDULE_ACCEPTED: [
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_BUSINESS",
  ],
  BOOKED: [
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_BUSINESS",
    "APPROVED",
  ],
  REJECTED: [],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_BUSINESS: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABEL_TR: Record<AppointmentStatus, string> = {
  PENDING_BUSINESS_APPROVAL: "Onay bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  RESCHEDULE_PROPOSED: "Alternatif saat",
  RESCHEDULE_ACCEPTED: "Yeni saat kabul",
  COMPLETED: "Tamamlandı",
  NO_SHOW: "Gelmedi",
  CANCELLED_BY_CUSTOMER: "Müşteri iptal",
  CANCELLED_BY_BUSINESS: "İşletme iptal",
  EXPIRED: "Süresi doldu",
  BOOKED: "Onaylandı",
  CANCELLED: "İptal",
};

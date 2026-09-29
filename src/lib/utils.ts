import { addDaysYmd, todayYmdInTz, zonedLocalToUtc } from "@/lib/business-timezone";
/** Müşteri hesap route'ları — işletme slug olarak kullanılamaz. */
export const RESERVED_BUSINESS_SLUGS = new Set([
  "giris-yap",
  "kayit-ol",
  "hesabim",
  "pin-sifirla",
  "hesap",
  "admin",
  "api",
  "panel",
]);

/** Türkçe karakterleri de dönüştüren slug üretici. */
export function slugify(text: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return text
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isReservedBusinessSlug(slug: string): boolean {
  return RESERVED_BUSINESS_SLUGS.has(slug);
}

/** Kuruş cinsinden tutarı "₺1.234,56" biçiminde gösterir. */
export function formatKurus(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(kurus / 100);
}

/** "125,50" veya "125.50" girişini kuruşa çevirir. */
export function parseTlToKurus(input: string): number | null {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatDateTr(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Bugünün başlangıç ve bitişi — işletme saat diliminde (Europe/Istanbul).
 * (2.2.1: sunucu UTC'de çalışırken 00:00–03:00 TR arası "dün" sayılıyordu.)
 */
export function todayRange(): { start: Date; end: Date } {
  const today = todayYmdInTz();
  return {
    start: zonedLocalToUtc(today, "00:00"),
    end: zonedLocalToUtc(addDaysYmd(today, 1), "00:00"),
  };
}

import type { Locale } from "@/generated/prisma/client";

export const LOCALES: Locale[] = ["TR", "EN", "ES", "DE", "RU", "AR"];

export const DEFAULT_LOCALE: Locale = "TR";

export const LOCALE_LABELS: Record<Locale, string> = {
  TR: "Türkçe",
  EN: "English",
  ES: "Español",
  DE: "Deutsch",
  RU: "Русский",
  AR: "العربية",
};

export const RTL_LOCALES: Locale[] = ["AR"];

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function isValidLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

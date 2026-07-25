import type { Locale } from "@/generated/prisma/client";

type TranslationRecord = {
  locale: Locale;
  name: string;
  description?: string | null;
};

/**
 * Resolves a translated field with fallback chain:
 * requested locale → default locale → base value on the entity.
 */
export function resolveTranslation(
  translations: TranslationRecord[],
  locale: Locale,
  defaultLocale: Locale,
  baseValue: string
): string {
  const byLocale = new Map(translations.map((t) => [t.locale, t]));
  return (
    byLocale.get(locale)?.name ??
    byLocale.get(defaultLocale)?.name ??
    baseValue
  );
}

/**
 * Resolves an optional description field with the same fallback chain.
 */
export function resolveDescription(
  translations: TranslationRecord[],
  locale: Locale,
  defaultLocale: Locale,
  baseValue: string | null | undefined
): string | null {
  const byLocale = new Map(translations.map((t) => [t.locale, t]));
  const translated =
    byLocale.get(locale)?.description ??
    byLocale.get(defaultLocale)?.description;
  if (translated != null && translated !== "") return translated;
  return baseValue ?? null;
}

"use client";

import type { Locale } from "@/generated/prisma/client";
import { LOCALE_LABELS, LOCALES } from "@/i18n/config";

const STORAGE_KEY = "tavern_menu_locale";

export function readStoredLocale(fallback: Locale = "TR"): Locale {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw && (LOCALES as string[]).includes(raw)) return raw as Locale;
  return fallback;
}

export function storeLocale(locale: Locale) {
  window.localStorage.setItem(STORAGE_KEY, locale);
}

export function LanguageSelector({
  value,
  enabled = LOCALES,
  onChange,
}: {
  value: Locale;
  enabled?: Locale[];
  onChange: (locale: Locale) => void;
}) {
  const options = enabled.length > 0 ? enabled : LOCALES;
  return (
    <label className="inline-flex items-center gap-2 text-xs text-cream-dim">
      <span className="sr-only">Dil</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value as Locale;
          storeLocale(next);
          onChange(next);
        }}
        className="rounded-lg border border-ink-line bg-ink-soft px-2 py-1.5 text-cream"
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/generated/prisma/client";
import { isRtlLocale } from "@/i18n/config";
import { MenuWelcome } from "@/components/musteri/MenuWelcome";
import { MenuList } from "@/components/musteri/MenuList";
import { DailyPick } from "@/components/musteri/DailyPick";
import { SuggestionWidget } from "@/components/musteri/SuggestionWidget";
import { CampaignPopup } from "@/components/musteri/CampaignPopup";
import { CustomerAccountChip } from "@/components/musteri/CustomerAccountChip";
import {
  LanguageSelector,
  readStoredLocale,
} from "@/components/musteri/LanguageSelector";
import type { PublicMenuCategory, PublicMenuProduct } from "@/lib/public-menu-data";

export function CustomerMenuApp({
  slug,
  businessName,
  logoUrl,
  bannerUrl,
  qrToken,
  canOrder,
  tableName,
  menuCategories,
  dailyProduct,
  suggestionEnabled,
  loyaltyEnabled,
  startOnWelcome = true,
  onOrderSubmitted,
  enabledLocales,
  defaultLocale = "TR",
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  qrToken: string | null;
  canOrder?: boolean;
  tableName: string | null;
  menuCategories: PublicMenuCategory[];
  dailyProduct: PublicMenuProduct | null;
  suggestionEnabled: boolean;
  loyaltyEnabled: boolean;
  startOnWelcome?: boolean;
  onOrderSubmitted?: () => void;
  enabledLocales?: Locale[];
  defaultLocale?: Locale;
}) {
  const orderToken = canOrder === false ? null : qrToken;
  const [welcome, setWelcome] = useState(startOnWelcome);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocale(readStoredLocale(defaultLocale));
  }, [defaultLocale]);

  useEffect(() => {
    document.documentElement.lang = locale.toLowerCase();
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    return () => {
      document.documentElement.dir = "ltr";
    };
  }, [locale]);

  const langControl = (
    <LanguageSelector
      value={locale}
      enabled={enabledLocales}
      onChange={setLocale}
    />
  );

  if (welcome) {
    return (
      <div className="relative" dir={isRtlLocale(locale) ? "rtl" : "ltr"}>
        <div className="pointer-events-auto absolute end-4 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex items-center gap-2">
          <CustomerAccountChip returnTo={`/${slug}`} />
          {langControl}
        </div>
        <MenuWelcome
          businessName={businessName}
          slug={slug}
          logoUrl={logoUrl}
          bannerUrl={bannerUrl}
          categories={menuCategories}
          onOpenMenu={() => {
            setInitialCategoryId(null);
            setWelcome(false);
          }}
          onSelectCategory={(id) => {
            setInitialCategoryId(id);
            setWelcome(false);
          }}
        />
        <CampaignPopup
          slug={slug}
          locale={locale}
          onSelectCategory={(id) => {
            setInitialCategoryId(id);
            setWelcome(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative space-y-6" dir={isRtlLocale(locale) ? "rtl" : "ltr"}>
      <div className="flex items-center justify-end gap-2">
        <CustomerAccountChip returnTo={`/${slug}`} />
        {langControl}
      </div>
      <CampaignPopup
        slug={slug}
        locale={locale}
        onSelectCategory={(id) => setInitialCategoryId(id)}
      />
      {dailyProduct && (
        <DailyPick
          product={dailyProduct}
          isletmeSlug={slug}
          masa={orderToken ?? undefined}
        />
      )}
      {suggestionEnabled && <SuggestionWidget slug={slug} />}

      {menuCategories.length === 0 ? (
        <p className="py-12 text-center text-sm text-cream-dim">Menü henüz hazırlanıyor.</p>
      ) : (
        <MenuList
          isletmeSlug={slug}
          categories={menuCategories}
          qrToken={orderToken}
          actionQrToken={qrToken}
          tableName={tableName}
          loyaltyEnabled={loyaltyEnabled}
          initialCategoryId={initialCategoryId}
          onOrderSubmitted={onOrderSubmitted}
        />
      )}
    </div>
  );
}

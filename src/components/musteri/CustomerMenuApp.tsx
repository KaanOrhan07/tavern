"use client";

import { useState } from "react";
import { MenuWelcome } from "@/components/musteri/MenuWelcome";
import { MenuList } from "@/components/musteri/MenuList";
import { DailyPick } from "@/components/musteri/DailyPick";
import { SuggestionWidget } from "@/components/musteri/SuggestionWidget";
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
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  qrToken: string | null;
  /** Masa QR var ama sipariş kapalıysa (WAITER_ONLY) false */
  canOrder?: boolean;
  tableName: string | null;
  menuCategories: PublicMenuCategory[];
  dailyProduct: PublicMenuProduct | null;
  suggestionEnabled: boolean;
  loyaltyEnabled: boolean;
  startOnWelcome?: boolean;
  onOrderSubmitted?: () => void;
}) {
  const orderToken = canOrder === false ? null : qrToken;
  const [welcome, setWelcome] = useState(startOnWelcome);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);

  if (welcome) {
    return (
      <MenuWelcome
        businessName={businessName}
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
    );
  }

  return (
    <div className="space-y-6">
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

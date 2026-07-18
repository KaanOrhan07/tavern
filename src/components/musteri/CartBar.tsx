"use client";

import { useState, useCallback } from "react";
import { formatKurus } from "@/lib/utils";
import { parseCartKey } from "@/lib/cart-key";
import { LoyaltyCheckout } from "@/components/musteri/LoyaltyCheckout";

export function CartBar({
  qrToken,
  cart,
  notes,
  priceByLineKey,
  businessSlug,
  loyaltyEnabled,
  expanded,
  onClose,
  onSubmitted,
}: {
  qrToken: string;
  cart: Map<string, number>;
  notes?: Map<string, string>;
  priceByLineKey: Map<string, number>;
  businessSlug: string;
  loyaltyEnabled: boolean;
  expanded?: boolean;
  onClose?: () => void;
  onSubmitted: (result: { ok: boolean; message: string }) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [loyalty, setLoyalty] = useState({ phone: "", redeem: false });
  const onLoyaltyChange = useCallback(
    (state: { phone: string; redeem: boolean }) => setLoyalty(state),
    []
  );

  if (cart.size === 0) return null;

  const subtotal = [...cart.entries()].reduce(
    (sum, [key, qty]) => sum + (priceByLineKey.get(key) ?? 0) * qty,
    0
  );

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrToken,
        items: [...cart.entries()].map(([key, quantity]) => {
          const { productId, variantId } = parseCartKey(key);
          const note = notes?.get(key);
          return {
            productId,
            quantity,
            ...(variantId ? { variantId } : {}),
            ...(note ? { note } : {}),
          };
        }),
        ...(loyaltyEnabled && loyalty.phone
          ? { customerPhone: loyalty.phone, redeemLoyalty: loyalty.redeem }
          : {}),
      }),
    });
    if (res.ok) {
      onSubmitted({ ok: true, message: "Siparişiniz alındı, afiyet olsun!" });
    } else {
      const data = await res.json().catch(() => null);
      onSubmitted({ ok: false, message: data?.error ?? "Sipariş verilemedi" });
    }
    setSubmitting(false);
  }

  if (!expanded) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-line bg-ink/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {loyaltyEnabled && (
            <LoyaltyCheckout
              businessSlug={businessSlug}
              subtotalKurus={subtotal}
              onChange={onLoyaltyChange}
            />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-xl bg-gold py-4 text-base font-semibold text-ink cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Gönderiliyor..." : `Sipariş Ver · ${formatKurus(subtotal)}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl rounded-t-2xl border border-ink-line bg-ink-card p-4 [animation:sheet-up_0.28s_ease-out]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-line" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sepet</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-cream-dim cursor-pointer"
          >
            Kapat
          </button>
        </div>
        {loyaltyEnabled && (
          <LoyaltyCheckout
            businessSlug={businessSlug}
            subtotalKurus={subtotal}
            onChange={onLoyaltyChange}
          />
        )}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-2 w-full rounded-xl bg-gold py-4 text-base font-semibold text-ink cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Gönderiliyor..." : `Sipariş Ver · ${formatKurus(subtotal)}`}
        </button>
      </div>
    </div>
  );
}

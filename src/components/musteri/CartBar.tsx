"use client";

import { useState, useCallback } from "react";
import { formatKurus } from "@/lib/utils";
import { parseCartKey } from "@/lib/cart-key";
import { LoyaltyCheckout } from "@/components/musteri/LoyaltyCheckout";

export function CartBar({
  qrToken,
  cart,
  priceByLineKey,
  businessSlug,
  loyaltyEnabled,
  onSubmitted,
}: {
  qrToken: string;
  cart: Map<string, number>;
  priceByLineKey: Map<string, number>;
  businessSlug: string;
  loyaltyEnabled: boolean;
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
          return {
            productId,
            quantity,
            ...(variantId ? { variantId } : {}),
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

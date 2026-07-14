"use client";

import { useState } from "react";
import { formatKurus } from "@/lib/utils";

export function CartBar({
  qrToken,
  cart,
  priceByProductId,
  onSubmitted,
}: {
  qrToken: string;
  cart: Map<string, number>;
  priceByProductId: Map<string, number>;
  onSubmitted: (result: { ok: boolean; message: string }) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (cart.size === 0) return null;

  const total = [...cart.entries()].reduce(
    (sum, [id, qty]) => sum + (priceByProductId.get(id) ?? 0) * qty,
    0
  );

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrToken,
        items: [...cart.entries()].map(([productId, quantity]) => ({ productId, quantity })),
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
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-xl bg-gold py-4 text-base font-semibold text-ink cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Gönderiliyor..." : `Sipariş Ver · ${formatKurus(total)}`}
        </button>
      </div>
    </div>
  );
}

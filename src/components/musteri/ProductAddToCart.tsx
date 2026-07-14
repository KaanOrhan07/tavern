"use client";

import { useState } from "react";
import { useCart } from "@/components/musteri/useCart";
import { CartBar } from "@/components/musteri/CartBar";

export function ProductAddToCart({
  qrToken,
  productId,
  priceEntries,
}: {
  qrToken: string;
  productId: string;
  /** Sepetteki diğer ürünlerin de tutarı doğru hesaplanabilsin diye işletmenin tüm ürün fiyatları. */
  priceEntries: [string, number][];
}) {
  const { cart, add, clear } = useCart(qrToken);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const qty = cart.get(productId) ?? 0;
  const priceByProductId = new Map(priceEntries);

  return (
    <>
      {message && (
        <p
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            message.kind === "ok"
              ? "border-ok/40 bg-ok/10 text-ok"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex items-center justify-between rounded-xl border border-ink-line bg-ink-card p-4">
        <p className="text-sm font-medium">Sepete ekle</p>
        <div className="flex items-center gap-2">
          {qty > 0 && (
            <>
              <button
                type="button"
                onClick={() => add(productId, -1)}
                className="h-11 w-11 rounded-lg border border-ink-line text-lg cursor-pointer"
              >
                −
              </button>
              <span className="w-5 text-center font-semibold">{qty}</span>
            </>
          )}
          <button
            type="button"
            onClick={() => add(productId, 1)}
            className="h-11 w-11 rounded-lg bg-gold text-lg font-bold text-ink cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      <CartBar
        qrToken={qrToken}
        cart={cart}
        priceByProductId={priceByProductId}
        onSubmitted={({ ok, message: text }) => {
          setMessage({ kind: ok ? "ok" : "error", text });
          if (ok) clear();
        }}
      />
    </>
  );
}

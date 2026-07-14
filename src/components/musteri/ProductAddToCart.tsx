"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/components/musteri/useCart";
import { CartBar } from "@/components/musteri/CartBar";
import { makeCartKey } from "@/lib/cart-key";
import { formatKurus } from "@/lib/utils";

type Variant = { id: string; name: string; priceKurus: number };

export function ProductAddToCart({
  qrToken,
  productId,
  basePriceKurus,
  variants,
  priceEntries,
  businessSlug,
  loyaltyEnabled,
}: {
  qrToken: string;
  productId: string;
  basePriceKurus: number;
  variants: Variant[];
  priceEntries: [string, number][];
  businessSlug: string;
  loyaltyEnabled: boolean;
}) {
  const { cart, add, clear } = useCart(qrToken);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");

  const activeVariant = variants.find((v) => v.id === selectedVariantId);
  const unitPrice = activeVariant?.priceKurus ?? basePriceKurus;
  const cartKey = makeCartKey(productId, activeVariant?.id);
  const qty = cart.get(cartKey) ?? 0;
  const priceByLineKey = useMemo(() => new Map(priceEntries), [priceEntries]);

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

      {variants.length > 0 && (
        <div className="rounded-xl border border-ink-line bg-ink-card p-4">
          <p className="mb-2 text-sm font-medium">Boyut / Seçenek</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                  selectedVariantId === v.id
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-ink-line text-cream-dim"
                }`}
              >
                {v.name} · {formatKurus(v.priceKurus)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-ink-line bg-ink-card p-4">
        <p className="text-sm font-medium">
          Sepete ekle
          <span className="ml-2 text-gold">{formatKurus(unitPrice)}</span>
        </p>
        <div className="flex items-center gap-2">
          {qty > 0 && (
            <>
              <button
                type="button"
                onClick={() => add(cartKey, -1)}
                className="h-11 w-11 rounded-lg border border-ink-line text-lg cursor-pointer"
              >
                −
              </button>
              <span className="w-5 text-center font-semibold">{qty}</span>
            </>
          )}
          <button
            type="button"
            onClick={() => add(cartKey, 1)}
            className="h-11 w-11 rounded-lg bg-gold text-lg font-bold text-ink cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      <CartBar
        qrToken={qrToken}
        cart={cart}
        priceByLineKey={priceByLineKey}
        businessSlug={businessSlug}
        loyaltyEnabled={loyaltyEnabled}
        onSubmitted={({ ok, message: text }) => {
          setMessage({ kind: ok ? "ok" : "error", text });
          if (ok) clear();
        }}
      />
    </>
  );
}

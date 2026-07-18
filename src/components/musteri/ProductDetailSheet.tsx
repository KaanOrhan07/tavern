"use client";

import { useEffect, useState } from "react";
import { formatKurus } from "@/lib/utils";
import { makeCartKey } from "@/lib/cart-key";
import { ProductImage } from "@/components/musteri/ProductImage";
import { ProductNutritionBadges } from "@/components/musteri/ProductNutritionBadges";
import type { PublicMenuProduct } from "@/lib/public-menu-data";

export function ProductDetailSheet({
  product,
  canOrder,
  onClose,
  onAdd,
}: {
  product: PublicMenuProduct;
  canOrder: boolean;
  onClose: () => void;
  onAdd: (cartKey: string, quantity: number, note?: string) => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id ?? ""
  );
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const activeVariant = product.variants.find((v) => v.id === selectedVariantId);
  const unitPrice = activeVariant?.priceKurus ?? product.priceKurus;
  const cartKey = makeCartKey(product.id, activeVariant?.id);

  function handleAdd() {
    if (!canOrder || product.outOfStock) return;
    onAdd(cartKey, qty, note.trim() || undefined);
    setAdded(true);
    window.setTimeout(() => {
      setAdded(false);
      onClose();
    }, 700);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-ink-line bg-ink-card shadow-2xl [animation:sheet-up_0.28s_ease-out]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-line" />
        <div className="overflow-y-auto px-4 pb-6 pt-3">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="aspect-[4/3] w-full rounded-xl bg-ink-soft object-cover"
          />

          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              {product.description && (
                <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">
                  {product.description}
                </p>
              )}
            </div>
            <p className="shrink-0 text-lg font-semibold text-gold">
              {formatKurus(unitPrice * qty)}
            </p>
          </div>

          <div className="mt-3">
            <ProductNutritionBadges
              calories={product.calories}
              allergens={product.allergens}
              vegan={product.vegan}
              vegetarian={product.vegetarian}
              glutenFree={product.glutenFree}
            />
          </div>

          {product.allergens.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-1 text-xs text-warn"
                >
                  ⚠ {a}
                </span>
              ))}
            </div>
          )}

          {product.hasVariants && product.variants.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Boyut / Seçenek</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
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

          {canOrder && !product.outOfStock && (
            <>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm font-medium">Adet</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-11 w-11 rounded-lg border border-ink-line text-lg cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    className="h-11 w-11 rounded-lg border border-ink-line text-lg cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium" htmlFor="product-note">
                  Not (isteğe bağlı)
                </label>
                <input
                  id="product-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder='ör: "şekersiz olsun", "az buzlu"'
                  className="w-full rounded-lg border border-ink-line bg-ink px-3 py-2.5 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className={`mt-5 w-full rounded-xl py-4 text-base font-semibold cursor-pointer transition-colors ${
                  added ? "bg-ok text-ink" : "bg-gold text-ink"
                }`}
              >
                {added ? "Eklendi ✓" : `Ekle · ${formatKurus(unitPrice * qty)}`}
              </button>
            </>
          )}

          {product.outOfStock && (
            <p className="mt-5 text-center text-sm font-medium text-danger">Tükendi</p>
          )}

          {!canOrder && !product.outOfStock && (
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-ink-line py-3.5 text-sm cursor-pointer"
            >
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

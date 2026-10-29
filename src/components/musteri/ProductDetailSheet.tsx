"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, Check, Minus, Plus, Wine, X } from "lucide-react";
import { formatKurus } from "@/lib/utils";
import { makeCartKey } from "@/lib/cart-key";
import { ProductImage } from "@/components/musteri/ProductImage";
import { ProductNutritionBadges } from "@/components/musteri/ProductNutritionBadges";
import { allergenIcon, allergenLabel } from "@/lib/allergens";
import type { PublicMenuProduct } from "@/lib/public-menu-data";

export function ProductDetailSheet({
  product,
  canOrder,
  locale = "TR",
  onClose,
  onAdd,
}: {
  product: PublicMenuProduct;
  canOrder: boolean;
  locale?: string;
  onClose: () => void;
  onAdd: (cartKey: string, quantity: number, note?: string) => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id ?? ""
  );
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [added, setAdded] = useState(false);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

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
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="anim-sheet-up relative z-10 flex max-h-[min(92dvh,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-ink-line bg-ink-card shadow-[var(--shadow-3)]"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? "none" : "transform var(--dur-base) var(--ease-out)",
        }}
      >
        {/* Tutamaç: aşağı sürükleyerek kapat */}
        <div
          className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center"
          onPointerDown={(e) => {
            dragStart.current = e.clientY;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragStart.current !== null) setDragY(Math.max(0, e.clientY - dragStart.current));
          }}
          onPointerUp={() => {
            const far = dragY > 110;
            dragStart.current = null;
            setDragging(false);
            setDragY(0);
            if (far) onClose();
          }}
        >
          <span className="h-1 w-10 rounded-full bg-ink-line" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="glass absolute end-3 top-8 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-ink-line text-cream"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 [-webkit-overflow-scrolling:touch]">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="aspect-[4/3] w-full max-h-[40dvh] rounded-2xl bg-ink-soft object-cover"
          />

          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight [font-family:var(--tv-heading-font,inherit)]">{product.name}</h2>
              {product.description && (
                <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">
                  {product.description}
                </p>
              )}
            </div>
            <p className="tabular shrink-0 text-xl font-bold text-gold">
              {formatKurus(unitPrice * qty)}
            </p>
          </div>

          <div className="mt-3">
            <ProductNutritionBadges
              calories={product.calories}
              allergens={product.allergens}
              allergenKeys={product.allergenKeys}
              containsAlcohol={product.containsAlcohol}
              containsPork={product.containsPork}
              vegan={product.vegan}
              vegetarian={product.vegetarian}
              glutenFree={product.glutenFree}
              locale={locale}
            />
          </div>

          {(product.containsAlcohol || product.containsPork) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.containsAlcohol && (
                <span className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs text-danger">
                  <Wine className="h-3.5 w-3.5" aria-hidden /> Alkol içerir
                </span>
              )}
              {product.containsPork && (
                <span className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs text-danger">
                  <Ban className="h-3.5 w-3.5" aria-hidden /> Domuz ürünü içerir
                </span>
              )}
            </div>
          )}

          {product.allergenKeys.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-cream-dim">Alerjenler</p>
              <div className="flex flex-wrap gap-2">
                {product.allergenKeys.map((k) => (
                  <span
                    key={k}
                    className="rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-1 text-xs text-warn"
                  >
                    {allergenIcon(k)} {allergenLabel(k, locale)}
                  </span>
                ))}
              </div>
            </div>
          ) : product.labelsApproved ? (
            <p className="mt-3 text-xs text-cream-dim">Bilinen yaygın alerjen içermez.</p>
          ) : (
            <p className="mt-3 text-xs text-cream-dim">
              Bu ürünün alerjen bilgisi henüz doğrulanmadı — lütfen sipariş vermeden önce personele danışın.
            </p>
          )}

          {product.ingredientsText && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-cream-dim">İçindekiler</p>
              <p className="text-sm leading-relaxed text-cream-dim">{product.ingredientsText}</p>
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
                    className={`pressable min-h-11 rounded-xl border px-3.5 py-2 text-sm cursor-pointer ${
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
                    aria-label="Azalt"
                    className="pressable flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-line"
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <span key={qty} className="anim-pop tabular w-8 text-center text-lg font-semibold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    aria-label="Arttır"
                    className="pressable flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-line"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
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
                  className="w-full rounded-xl border border-ink-line bg-ink px-3.5 py-3 text-base outline-none focus:border-gold"
                />
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className={`pressable mt-5 flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-base font-semibold ${
                  added ? "bg-ok text-ink" : "bg-gold text-ink shadow-[var(--shadow-glow)]"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-5 w-5" aria-hidden /> Eklendi
                  </>
                ) : (
                  `Sepete ekle · ${formatKurus(unitPrice * qty)}`
                )}
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

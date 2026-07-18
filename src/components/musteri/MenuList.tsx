"use client";

import { useMemo, useRef, useState } from "react";
import { formatKurus } from "@/lib/utils";
import { ProductImage } from "@/components/musteri/ProductImage";
import { ProductNutritionBadges } from "@/components/musteri/ProductNutritionBadges";
import { useCart } from "@/components/musteri/useCart";
import { CartBar } from "@/components/musteri/CartBar";
import { ProductDetailSheet } from "@/components/musteri/ProductDetailSheet";
import { CustomerActionBar } from "@/components/musteri/CustomerActionBar";
import { LoyaltyPointsPanel } from "@/components/musteri/LoyaltyPointsPanel";
import { makeCartKey } from "@/lib/cart-key";
import type { PublicMenuCategory, PublicMenuProduct } from "@/lib/public-menu-data";

export function MenuList({
  isletmeSlug,
  categories,
  qrToken,
  actionQrToken = null,
  tableName = null,
  loyaltyEnabled,
  initialCategoryId = null,
  onOrderSubmitted,
}: {
  isletmeSlug: string;
  categories: PublicMenuCategory[];
  /** Sipariş verebilmek için masa token (CUSTOMER_QR) */
  qrToken: string | null;
  /** Garson/hesap için masa token (sipariş kapalı olsa da) */
  actionQrToken?: string | null;
  tableName?: string | null;
  loyaltyEnabled: boolean;
  initialCategoryId?: string | null;
  onOrderSubmitted?: () => void;
}) {
  const canOrder = qrToken !== null;
  const barQrToken = actionQrToken ?? qrToken;
  const { cart, notes, add, clear } = useCart(qrToken ?? barQrToken ?? "");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [manualCategoryId, setManualCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PublicMenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [categoryNavOpen, setCategoryNavOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const activeCategoryId =
    manualCategoryId ??
    (initialCategoryId && categories.some((c) => c.id === initialCategoryId)
      ? initialCategoryId
      : (categories[0]?.id ?? ""));

  const activeCategory =
    categories.find((c) => c.id === activeCategoryId) ?? categories[0] ?? null;

  const priceByLineKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) {
      for (const p of c.products) {
        if (p.hasVariants) {
          for (const v of p.variants) {
            map.set(makeCartKey(p.id, v.id), v.priceKurus);
          }
        } else {
          map.set(p.id, p.priceKurus);
        }
      }
    }
    return map;
  }, [categories]);

  const cartCount = [...cart.values()].reduce((s, q) => s + q, 0);
  const cartTotal = [...cart.entries()].reduce(
    (sum, [key, qty]) => sum + (priceByLineKey.get(key) ?? 0) * qty,
    0
  );

  function selectCategory(id: string) {
    setManualCategoryId(id);
    setCategoryNavOpen(false);
    const el = tabsRef.current?.querySelector(`[data-cat="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <>
      <div className="sticky top-[3.75rem] z-10 -mx-4 mb-4 border-b border-ink-line bg-ink/95 px-4 backdrop-blur">
        <div className="flex items-center justify-end py-2">
          <button
            type="button"
            aria-label="Kategoriler"
            onClick={() => setCategoryNavOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-line text-cream-dim cursor-pointer"
          >
            ☰
          </button>
        </div>
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto pb-3 scrollbar-none"
        >
          {categories.map((category) => {
            const active = category.id === activeCategory?.id;
            return (
              <button
                key={category.id}
                type="button"
                data-cat={category.id}
                onClick={() => selectCategory(category.id)}
                className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-cream text-ink"
                    : "bg-ink-card text-cream-dim hover:text-cream"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {categoryNavOpen && (
        <div className="mb-4 rounded-xl border border-ink-line bg-ink-card p-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCategory(c.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm cursor-pointer ${
                c.id === activeCategory?.id ? "bg-gold/15 text-gold" : "text-cream-dim"
              }`}
            >
              <span>{c.name}</span>
              <span className="text-xs opacity-70">{c.products.length}</span>
            </button>
          ))}
        </div>
      )}

      {message && (
        <p
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
            message.kind === "ok"
              ? "border-ok/40 bg-ok/10 text-ok"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      {activeCategory && (
        <section className="pb-36">
          <h2 className="mb-3 text-sm font-semibold text-cream">
            {activeCategory.name}
            <span className="ml-1.5 font-normal text-cream-dim">
              · {activeCategory.products.length} ürün
            </span>
          </h2>
          <div className="space-y-2.5">
            {activeCategory.products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProduct(product)}
                className={`flex w-full items-center gap-3.5 rounded-xl border border-ink-line bg-ink-card p-3 text-left transition-colors hover:border-gold-dark cursor-pointer ${
                  product.outOfStock ? "opacity-60" : ""
                }`}
              >
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-20 w-20 shrink-0 rounded-lg bg-ink-soft object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="mt-0.5 font-semibold text-gold">
                    {formatKurus(product.displayPriceKurus)}
                    {product.hasVariants ? "'den" : ""}
                  </p>
                  {product.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-cream-dim">
                      {product.description}
                    </p>
                  )}
                  {product.outOfStock ? (
                    <p className="mt-1 text-[11px] font-medium text-danger">Tükendi</p>
                  ) : (
                    <ProductNutritionBadges
                      calories={product.calories}
                      allergens={product.allergens}
                      vegan={product.vegan}
                      vegetarian={product.vegetarian}
                      glutenFree={product.glutenFree}
                      compact
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedProduct && (
        <ProductDetailSheet
          product={selectedProduct}
          canOrder={canOrder}
          onClose={() => setSelectedProduct(null)}
          onAdd={(cartKey, quantity, note) => {
            add(cartKey, quantity, note);
          }}
        />
      )}

      {pointsOpen && (
        <LoyaltyPointsPanel
          businessSlug={isletmeSlug}
          onClose={() => setPointsOpen(false)}
        />
      )}

      {canOrder && qrToken && cartOpen && (
        <CartBar
          qrToken={qrToken}
          cart={cart}
          notes={notes}
          priceByLineKey={priceByLineKey}
          businessSlug={isletmeSlug}
          loyaltyEnabled={loyaltyEnabled}
          expanded
          onClose={() => setCartOpen(false)}
          onSubmitted={({ ok, message: text }) => {
            setMessage({ kind: ok ? "ok" : "error", text });
            if (ok) {
              clear();
              setCartOpen(false);
              onOrderSubmitted?.();
            }
          }}
        />
      )}

      <CustomerActionBar
        tableName={tableName}
        qrToken={barQrToken}
        cartCount={canOrder ? cartCount : 0}
        cartTotal={canOrder ? cartTotal : 0}
        loyaltyEnabled={loyaltyEnabled}
        onViewCart={() => setCartOpen(true)}
        onShowPoints={() => setPointsOpen(true)}
      />
    </>
  );
}

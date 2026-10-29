"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Leaf, Minus, Plus, Search, Sprout, Wheat, X } from "lucide-react";
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

type DietFilter = "vegan" | "vegetarian" | "glutenFree";

const DIET_FILTERS: { key: DietFilter; label: string; icon: typeof Leaf }[] = [
  { key: "vegan", label: "Vegan", icon: Sprout },
  { key: "vegetarian", label: "Vejetaryen", icon: Leaf },
  { key: "glutenFree", label: "Glutensiz", icon: Wheat },
];

function fold(s: string) {
  return s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
}

export function MenuList({
  isletmeSlug,
  categories,
  qrToken,
  actionQrToken = null,
  tableName = null,
  loyaltyEnabled,
  initialCategoryId = null,
  onOrderSubmitted,
  locale = "TR",
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
  locale?: string;
}) {
  const canOrder = qrToken !== null;
  const barQrToken = actionQrToken ?? qrToken;
  const { cart, notes, add, clear } = useCart(qrToken ?? barQrToken ?? "");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PublicMenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [diets, setDiets] = useState<Set<DietFilter>>(new Set());
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? "");
  const railRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<number>(0);

  const priceByLineKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) {
      for (const p of c.products) {
        if (p.hasVariants) {
          for (const v of p.variants) map.set(makeCartKey(p.id, v.id), v.priceKurus);
        } else {
          map.set(p.id, p.priceKurus);
        }
      }
    }
    return map;
  }, [categories]);

  const cartCount = [...cart.values()].reduce((s, q) => s + q, 0);
  const cartTotal = [...cart.entries()].reduce((sum, [key, qty]) => sum + (priceByLineKey.get(key) ?? 0) * qty, 0);

  // Arama + diyet filtreleri: boş kalan kategoriler gizlenir
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return categories
      .map((c) => ({
        ...c,
        products: c.products.filter((p) => {
          if (q && !fold(`${p.name} ${p.description ?? ""}`).includes(q)) return false;
          for (const d of diets) if (!p[d]) return false;
          return true;
        }),
      }))
      .filter((c) => c.products.length > 0);
  }, [categories, query, diets]);

  const centerChip = useCallback((id: string) => {
    const rail = railRef.current;
    const chip = rail?.querySelector<HTMLElement>(`[data-cat="${id}"]`);
    if (!rail || !chip) return;
    rail.scrollTo({ left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, []);

  const scrollToCategory = useCallback(
    (id: string) => {
      const el = document.getElementById(`cat-${id}`);
      if (!el) return;
      lockRef.current = Date.now() + 700; // kaydırma animasyonu sırasında scroll-spy sustur
      setActiveId(id);
      centerChip(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [centerChip]
  );

  // Scroll-spy: ekranın üstüne en yakın bölüm aktif kategori olur
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf || Date.now() < lockRef.current) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        let current = "";
        for (const c of visible) {
          const el = document.getElementById(`cat-${c.id}`);
          if (el && el.getBoundingClientRect().top <= 150) current = c.id;
        }
        if (current) {
          setActiveId((prev) => {
            if (prev !== current) centerChip(current);
            return current;
          });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible, centerChip]);

  // Karşılama ekranından seçilen kategoriye git
  useEffect(() => {
    if (!initialCategoryId) return;
    const t = setTimeout(() => scrollToCategory(initialCategoryId), 120);
    return () => clearTimeout(t);
  }, [initialCategoryId, scrollToCategory]);

  function toggleDiet(k: DietFilter) {
    setDiets((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const filtering = query.trim() !== "" || diets.size > 0;
  let cardIndex = 0;

  return (
    <>
      {/* Diyet filtreleri (kaydırınca yukarıda kalır) */}
    <div className="hide-scrollbar fade-edges -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
      {DIET_FILTERS.map(({ key, label, icon: Icon }) => {
        const on = diets.has(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => toggleDiet(key)}
            className={`pressable flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
              on ? "border-gold bg-gold/15 text-gold" : "border-ink-line text-cream-dim"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>


      {/* Yapışkan araç çubuğu: arama + diyet filtreleri + kategori rayı */}
      <div className="glass sticky top-14 z-10 -mx-4 mb-4 border-b border-ink-line px-4 pt-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-dim" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Menüde ara…"
            aria-label="Menüde ara"
            enterKeyHint="search"
            className="h-11 w-full rounded-xl border border-ink-line bg-ink-card ps-10 pe-10 text-base text-cream outline-none transition-colors placeholder:text-cream-dim/70 focus:border-gold"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Aramayı temizle"
              className="absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-cream-dim hover:bg-ink-soft"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <div
          ref={railRef}
          role="tablist"
          aria-label="Kategoriler"
          className="hide-scrollbar -mx-4 flex gap-1 overflow-x-auto overscroll-x-contain px-4 pb-0.5"
        >
          {visible.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-cat={c.id}
                onClick={() => scrollToCategory(c.id)}
                className={`relative shrink-0 cursor-pointer px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "text-cream" : "text-cream-dim hover:text-cream"
                }`}
              >
                {c.name}
                <span
                  className={`absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-gold transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`anim-fade-up mb-4 rounded-xl border px-4 py-2.5 text-sm ${
            message.kind === "ok" ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="anim-fade-in flex flex-col items-center gap-3 py-16 text-center">
          <Search className="h-10 w-10 text-cream-dim/50" aria-hidden />
          <p className="text-sm text-cream-dim">Aramanıza uygun ürün bulunamadı</p>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDiets(new Set());
              }}
              className="pressable min-h-11 cursor-pointer rounded-full border border-gold px-5 text-sm text-gold"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {visible.map((category) => (
            <section key={category.id} id={`cat-${category.id}`} className="min-w-0 scroll-mt-[8rem]">
              <h2 className="mb-3 flex items-baseline gap-2 text-lg font-semibold tracking-tight [font-family:var(--tv-heading-font,inherit)]">
                {category.name}
                <span className="text-xs font-normal text-cream-dim">{category.products.length} ürün</span>
              </h2>
              <div className="space-y-3">
                {category.products.map((product) => {
                  const idx = cardIndex++;
                  const simpleKey = makeCartKey(product.id, undefined);
                  const qty = !product.hasVariants ? (cart.get(simpleKey) ?? 0) : 0;
                  const variantQty = product.hasVariants
                    ? product.variants.reduce((s, v) => s + (cart.get(makeCartKey(product.id, v.id)) ?? 0), 0)
                    : 0;
                  const inCart = qty + variantQty;
                  return (
                    <article
                      key={product.id}
                      style={{ ["--i" as string]: Math.min(idx, 8) }}
                      className={`anim-fade-up group relative flex overflow-hidden rounded-2xl border bg-ink-card shadow-[var(--shadow-1)] transition-colors ${
                        inCart > 0 ? "border-gold/60" : "border-ink-line"
                      } ${product.outOfStock ? "opacity-60" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        aria-label={`${product.name} detayı`}
                        className="pressable flex min-w-0 flex-1 cursor-pointer items-stretch gap-3 p-3 text-start"
                      >
                        <ProductImage
                          src={product.imageUrl}
                          alt=""
                          className="h-24 w-24 shrink-0 rounded-xl bg-ink-soft object-cover"
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{product.name}</span>
                          {product.description && (
                            <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-cream-dim">{product.description}</span>
                          )}
                          <span className="mt-auto pt-1.5">
                            {product.outOfStock ? (
                              <span className="text-xs font-medium text-danger">Tükendi</span>
                            ) : (
                              <ProductNutritionBadges
                                calories={product.calories}
                                allergens={product.allergens}
                                allergenKeys={product.allergenKeys}
                                containsAlcohol={product.containsAlcohol}
                                containsPork={product.containsPork}
                                locale={locale}
                                vegan={product.vegan}
                                vegetarian={product.vegetarian}
                                glutenFree={product.glutenFree}
                                compact
                              />
                            )}
                            <span className="tabular mt-1 block text-base font-bold text-gold">
                              {formatKurus(product.displayPriceKurus)}
                              {product.hasVariants ? "'den" : ""}
                            </span>
                          </span>
                        </span>
                      </button>

                      {canOrder && !product.outOfStock && (
                        <div className="absolute end-3 bottom-3">
                          {qty > 0 ? (
                            <div className="anim-scale-in flex items-center gap-0.5 rounded-full bg-gold p-0.5 text-ink shadow-[var(--shadow-2)]">
                              <button
                                type="button"
                                onClick={() => add(simpleKey, -1)}
                                aria-label="Azalt"
                                className="pressable flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
                              >
                                <Minus className="h-4 w-4" aria-hidden />
                              </button>
                              <span key={qty} className="anim-pop tabular w-5 text-center text-sm font-bold">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => add(simpleKey, 1)}
                                aria-label="Arttır"
                                className="pressable flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
                              >
                                <Plus className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => (product.hasVariants ? setSelectedProduct(product) : add(simpleKey, 1))}
                              aria-label={`${product.name} ekle`}
                              className="pressable flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-gold text-ink shadow-[var(--shadow-2)] hover:bg-gold-light"
                            >
                              <Plus className="h-5 w-5" aria-hidden />
                            </button>
                          )}
                          {variantQty > 0 && (
                            <span className="anim-pop tabular absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cream px-1 text-[11px] font-bold text-ink">
                              {variantQty}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailSheet
          product={selectedProduct}
          canOrder={canOrder}
          locale={locale}
          onClose={() => setSelectedProduct(null)}
          onAdd={(cartKey, quantity, note) => {
            add(cartKey, quantity, note);
          }}
        />
      )}

      {pointsOpen && <LoyaltyPointsPanel businessSlug={isletmeSlug} onClose={() => setPointsOpen(false)} />}

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

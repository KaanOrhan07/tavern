"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatKurus } from "@/lib/utils";
import { ProductImage } from "@/components/musteri/ProductImage";
import { useCart } from "@/components/musteri/useCart";
import { CartBar } from "@/components/musteri/CartBar";
import { makeCartKey } from "@/lib/cart-key";
import { CallWaiterButton } from "@/components/musteri/CallWaiterButton";

type Variant = { id: string; name: string; priceKurus: number };

type Product = {
  id: string;
  name: string;
  slug: string;
  priceKurus: number;
  imageUrl: string;
  allergens: string[];
  outOfStock: boolean;
  variants: Variant[];
  defaultCartKey: string;
  displayPriceKurus: number;
  hasVariants: boolean;
};
type Category = { id: string; name: string; products: Product[] };
type BillItem = {
  productName: string;
  unitKurus: number;
  quantity: number;
  paidQuantity: number;
  delivered: boolean;
};

export function CustomerTable({
  slug,
  qrToken,
  tableName,
  orderMode,
  categories,
  loyaltyEnabled,
}: {
  slug: string;
  qrToken: string;
  tableName: string;
  orderMode: "WAITER_ONLY" | "CUSTOMER_QR";
  categories: Category[];
  loyaltyEnabled: boolean;
}) {
  const canOrder = orderMode === "CUSTOMER_QR";
  const [bill, setBill] = useState<BillItem[] | null>(null);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const { cart, add: cartAdd, clear: clearCart } = useCart(qrToken);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const loadBill = useCallback(async () => {
    const res = await fetch(`/api/public/table/${qrToken}`);
    if (res.ok) {
      const data = await res.json();
      setBill(data.order?.items ?? []);
    }
  }, [qrToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState fetch sonrası çalışır
    loadBill();
    const id = setInterval(loadBill, 12_000);
    return () => clearInterval(id);
  }, [loadBill]);

  const billTotals = useMemo(() => {
    const list = bill ?? [];
    const total = list.reduce((s, i) => s + i.unitKurus * i.quantity, 0);
    const paid = list.reduce((s, i) => s + i.unitKurus * i.paidQuantity, 0);
    return { total, remaining: total - paid };
  }, [bill]);

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

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{tableName}</h1>
          <p className="text-xs text-cream-dim">
            {canOrder
              ? "Menüden seçim yapıp sipariş verebilirsiniz."
              : "Sipariş için garsonunuza seslenebilirsiniz."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CallWaiterButton qrToken={qrToken} />
          <Link
            href={`/${slug}/menu?masa=${qrToken}`}
            className="rounded-lg border border-ink-line px-3.5 py-2.5 text-sm text-cream-dim hover:text-cream"
          >
            Menü
          </Link>
        </div>
      </div>

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

      {/* Hesap */}
      {bill !== null && bill.length > 0 && (
        <section className="rounded-xl border border-ink-line bg-ink-card">
          <p className="border-b border-ink-line p-4 text-sm font-medium">Hesabınız</p>
          <div className="divide-y divide-ink-line/50">
            {bill.map((item, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm">
                    {item.quantity} × {item.productName}
                  </p>
                  <p className="text-[11px] text-cream-dim">
                    {item.delivered ? "Teslim edildi" : "Hazırlanıyor"}
                    {item.paidQuantity > 0 && ` · ${item.paidQuantity} adet ödendi`}
                  </p>
                </div>
                <p className="text-sm text-gold">
                  {formatKurus(item.unitKurus * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-ink-line p-4 text-sm">
            <p className="font-medium">Kalan Toplam</p>
            <p className="font-semibold text-gold">{formatKurus(billTotals.remaining)}</p>
          </div>
        </section>
      )}

      {/* Menü + sipariş */}
      {canOrder && categories.length > 0 && (
        <section className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                  activeCategory === c.id
                    ? "bg-gold text-ink"
                    : "bg-ink-soft text-cream-dim"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {categories
              .find((c) => c.id === activeCategory)
              ?.products.map((product) => {
                const cartKey = product.defaultCartKey;
                const qty = cart.get(cartKey) ?? 0;
                const quickAdd = !product.outOfStock && !product.hasVariants;
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 rounded-xl border border-ink-line bg-ink-card p-3 ${
                      product.outOfStock ? "opacity-60" : ""
                    }`}
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-14 w-14 shrink-0 rounded-lg bg-ink-soft object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${slug}/menu/${product.slug}?masa=${qrToken}`}
                        className="text-sm font-medium hover:text-gold"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-gold">
                        {product.hasVariants ? "Seçenekli · " : ""}
                        {formatKurus(product.displayPriceKurus)}
                      </p>
                      {product.outOfStock ? (
                        <p className="text-[11px] font-medium text-danger">Tükendi</p>
                      ) : (
                        product.allergens.length > 0 && (
                          <p className="text-[11px] text-warn">
                            ⚠ {product.allergens.join(", ")}
                          </p>
                        )
                      )}
                    </div>
                    {quickAdd && (
                      <div className="flex items-center gap-2">
                        {qty > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => cartAdd(cartKey, -1)}
                              className="h-11 w-11 rounded-lg border border-ink-line text-lg cursor-pointer"
                            >
                              −
                            </button>
                            <span className="w-5 text-center font-semibold">{qty}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => cartAdd(cartKey, 1)}
                          className="h-11 w-11 rounded-lg bg-gold text-lg font-bold text-ink cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Sepet çubuğu */}
      {canOrder && (
        <CartBar
          qrToken={qrToken}
          cart={cart}
          priceByLineKey={priceByLineKey}
          businessSlug={slug}
          loyaltyEnabled={loyaltyEnabled}
          onSubmitted={({ ok, message: text }) => {
            setMessage({ kind: ok ? "ok" : "error", text });
            if (ok) {
              clearCart();
              loadBill();
            }
          }}
        />
      )}
    </div>
  );
}

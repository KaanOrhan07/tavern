"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatKurus } from "@/lib/utils";
import { ProductImage } from "@/components/musteri/ProductImage";
import { useCart } from "@/components/musteri/useCart";
import { CartBar } from "@/components/musteri/CartBar";

type Product = {
  id: string;
  name: string;
  slug: string;
  priceKurus: number;
  imageUrl: string;
  allergens: string[];
  description: string | null;
  outOfStock: boolean;
};
type Category = { id: string; name: string; products: Product[] };

export function MenuList({
  isletmeSlug,
  categories,
  qrToken,
}: {
  isletmeSlug: string;
  categories: Category[];
  qrToken: string | null;
}) {
  const canOrder = qrToken !== null;
  const { cart, add, clear } = useCart(qrToken ?? "");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const priceByProductId = useMemo(
    () => new Map(categories.flatMap((c) => c.products).map((p) => [p.id, p.priceKurus])),
    [categories]
  );

  const productHref = (slug: string) =>
    qrToken ? `/${isletmeSlug}/menu/${slug}?masa=${qrToken}` : `/${isletmeSlug}/menu/${slug}`;

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

      {categories.map((category) => (
        <section key={category.id}>
          <h2 className="mb-3 border-b border-ink-line pb-2 text-sm font-semibold tracking-wide text-gold">
            {category.name}
          </h2>
          <div className="space-y-2.5">
            {category.products.map((product) => {
              const qty = cart.get(product.id) ?? 0;
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3.5 rounded-xl border border-ink-line bg-ink-card p-3 transition-colors hover:border-gold-dark ${
                    product.outOfStock ? "opacity-60" : ""
                  }`}
                >
                  <Link href={productHref(product.slug)} className="flex min-w-0 flex-1 items-center gap-3.5">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-16 w-16 shrink-0 rounded-lg bg-ink-soft object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-cream-dim">
                          {product.description}
                        </p>
                      )}
                      {product.outOfStock ? (
                        <p className="mt-1 text-[11px] font-medium text-danger">Tükendi</p>
                      ) : (
                        product.allergens.length > 0 && (
                          <p className="mt-1 text-[11px] text-warn">
                            ⚠ {product.allergens.join(", ")}
                          </p>
                        )
                      )}
                      <p className="mt-1 font-semibold text-gold">{formatKurus(product.priceKurus)}</p>
                    </div>
                  </Link>
                  {canOrder && !product.outOfStock && (
                    <div className="flex shrink-0 items-center gap-2">
                      {qty > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => add(product.id, -1)}
                            className="h-11 w-11 rounded-lg border border-ink-line text-lg cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-semibold">{qty}</span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => add(product.id, 1)}
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
      ))}

      {canOrder && qrToken && (
        <CartBar
          qrToken={qrToken}
          cart={cart}
          priceByProductId={priceByProductId}
          onSubmitted={({ ok, message: text }) => {
            setMessage({ kind: ok ? "ok" : "error", text });
            if (ok) clear();
          }}
        />
      )}
    </>
  );
}

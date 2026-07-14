"use client";

import { useCallback, useEffect, useState } from "react";

type CartMap = Map<string, number>;

function storageKey(qrToken: string) {
  return `tavern_cart_${qrToken}`;
}

function readCart(qrToken: string): CartMap {
  if (typeof window === "undefined" || !qrToken) return new Map();
  try {
    const raw = window.localStorage.getItem(storageKey(qrToken));
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [string, number][]);
  } catch {
    return new Map();
  }
}

function writeCart(qrToken: string, cart: CartMap) {
  if (typeof window === "undefined" || !qrToken) return;
  window.localStorage.setItem(storageKey(qrToken), JSON.stringify([...cart.entries()]));
}

/**
 * Müşteri sepetini masa (qrToken) bazında localStorage'da tutar.
 * Böylece müşteri masa sayfası ↔ menü ↔ ürün detayı arasında gezinse de sepet kaybolmaz.
 */
export function useCart(qrToken: string) {
  const [cart, setCart] = useState<CartMap>(() => new Map());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage yalnızca mount sonrası okunabilir
    setCart(readCart(qrToken));
  }, [qrToken]);

  const add = useCallback(
    (productId: string, delta: number) => {
      setCart((prev) => {
        const next = new Map(prev);
        const qty = (next.get(productId) ?? 0) + delta;
        if (qty <= 0) next.delete(productId);
        else next.set(productId, qty);
        writeCart(qrToken, next);
        return next;
      });
    },
    [qrToken]
  );

  const clear = useCallback(() => {
    setCart(new Map());
    writeCart(qrToken, new Map());
  }, [qrToken]);

  return { cart, add, clear };
}

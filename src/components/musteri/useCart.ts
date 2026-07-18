"use client";

import { useCallback, useEffect, useState } from "react";

type CartMap = Map<string, number>;
type NotesMap = Map<string, string>;

function storageKey(qrToken: string) {
  return `tavern_cart_${qrToken}`;
}

function notesKey(qrToken: string) {
  return `tavern_cart_notes_${qrToken}`;
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

function readNotes(qrToken: string): NotesMap {
  if (typeof window === "undefined" || !qrToken) return new Map();
  try {
    const raw = window.localStorage.getItem(notesKey(qrToken));
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [string, string][]);
  } catch {
    return new Map();
  }
}

function writeCart(qrToken: string, cart: CartMap) {
  if (typeof window === "undefined" || !qrToken) return;
  window.localStorage.setItem(storageKey(qrToken), JSON.stringify([...cart.entries()]));
}

function writeNotes(qrToken: string, notes: NotesMap) {
  if (typeof window === "undefined" || !qrToken) return;
  window.localStorage.setItem(notesKey(qrToken), JSON.stringify([...notes.entries()]));
}

/**
 * Müşteri sepetini masa (qrToken) bazında localStorage'da tutar.
 * Böylece müşteri masa sayfası ↔ menü ↔ ürün detayı arasında gezinse de sepet kaybolmaz.
 */
export function useCart(qrToken: string) {
  const [cart, setCart] = useState<CartMap>(() => new Map());
  const [notes, setNotes] = useState<NotesMap>(() => new Map());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage yalnızca mount sonrası okunabilir
    setCart(readCart(qrToken));
    setNotes(readNotes(qrToken));
  }, [qrToken]);

  const add = useCallback(
    (lineKey: string, delta: number, note?: string) => {
      setCart((prev) => {
        const next = new Map(prev);
        const qty = (next.get(lineKey) ?? 0) + delta;
        if (qty <= 0) {
          next.delete(lineKey);
          setNotes((prevNotes) => {
            const nextNotes = new Map(prevNotes);
            nextNotes.delete(lineKey);
            writeNotes(qrToken, nextNotes);
            return nextNotes;
          });
        } else {
          next.set(lineKey, qty);
          if (note) {
            setNotes((prevNotes) => {
              const nextNotes = new Map(prevNotes);
              nextNotes.set(lineKey, note);
              writeNotes(qrToken, nextNotes);
              return nextNotes;
            });
          }
        }
        writeCart(qrToken, next);
        return next;
      });
    },
    [qrToken]
  );

  const clear = useCallback(() => {
    setCart(new Map());
    setNotes(new Map());
    writeCart(qrToken, new Map());
    writeNotes(qrToken, new Map());
  }, [qrToken]);

  return { cart, notes, add, clear };
}

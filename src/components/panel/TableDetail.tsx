"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import {
  isPrinterConnected,
  printKitchenTicket,
} from "@/lib/printer";

type OrderItem = {
  id: string;
  productName: string;
  unitKurus: number;
  quantity: number;
  paidQuantity: number;
  delivered: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  products: { id: string; name: string; priceKurus: number; imageUrl: string }[];
};

export function TableDetail({
  slug,
  tableId,
  tableName,
  qrToken,
  orderMode,
  isOwner,
  printerEnabled,
  categories,
}: {
  slug: string;
  tableId: string;
  tableName: string;
  qrToken: string;
  orderMode: "WAITER_ONLY" | "CUSTOMER_QR";
  isOwner: boolean;
  printerEnabled: boolean;
  categories: MenuCategory[];
}) {
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  // Sipariş ekleme
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // Ödeme
  const [payMode, setPayMode] = useState(false);
  const [paySelection, setPaySelection] = useState<Map<string, number>>(new Map());
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/panel/tables/${tableId}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.order?.items ?? []);
      setOrderId(data.order?.id ?? null);
    }
  }, [tableId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState fetch sonrası çalışır
    load();
    const id = setInterval(load, 8_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const url = `${window.location.origin}/${slug}/masa/${qrToken}`;
    QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: "#0A0A0A", light: "#F5EFE0" },
    }).then(setQrDataUrl);
  }, [slug, qrToken]);

  const totals = useMemo(() => {
    const list = items ?? [];
    const total = list.reduce((s, i) => s + i.unitKurus * i.quantity, 0);
    const paid = list.reduce((s, i) => s + i.unitKurus * i.paidQuantity, 0);
    const selected = [...paySelection.entries()].reduce((s, [id, qty]) => {
      const item = list.find((i) => i.id === id);
      return s + (item ? item.unitKurus * qty : 0);
    }, 0);
    return { total, remaining: total - paid, selected };
  }, [items, paySelection]);

  // --- Sipariş ekleme ---

  function cartAdd(productId: string, delta: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const qty = (next.get(productId) ?? 0) + delta;
      if (qty <= 0) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
  }

  const cartTotal = useMemo(() => {
    let sum = 0;
    for (const [productId, qty] of cart) {
      for (const cat of categories) {
        const p = cat.products.find((p) => p.id === productId);
        if (p) sum += p.priceKurus * qty;
      }
    }
    return sum;
  }, [cart, categories]);

  async function submitOrder() {
    if (cart.size === 0) return;
    setSubmitting(true);
    setError(null);
    const orderItems = [...cart.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    const res = await fetch("/api/panel/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, items: orderItems }),
    });
    if (res.ok) {
      // Mutfak fişi (yazıcı bağlıysa)
      if (printerEnabled && isPrinterConnected()) {
        const ticketItems = orderItems.map(({ productId, quantity }) => {
          const product = categories
            .flatMap((c) => c.products)
            .find((p) => p.id === productId);
          return { name: product?.name ?? "?", quantity };
        });
        try {
          await printKitchenTicket({ tableName, items: ticketItems, time: new Date() });
        } catch {
          setError("Sipariş kaydedildi ancak mutfak fişi basılamadı");
        }
      }
      setCart(new Map());
      setShowAddSheet(false);
      load();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Sipariş eklenemedi");
    }
    setSubmitting(false);
  }

  // --- Teslim / silme ---

  async function toggleDelivered(item: OrderItem) {
    await fetch(`/api/panel/orders/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivered: !item.delivered }),
    });
    load();
  }

  async function removeItem(item: OrderItem) {
    if (!confirm(`"${item.productName}" silinsin mi? Stok geri eklenecek.`)) return;
    const res = await fetch(`/api/panel/orders/items/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Kalem silinemedi");
    }
    load();
  }

  // --- Ödeme ---

  function paySelect(item: OrderItem, delta: number) {
    setPaySelection((prev) => {
      const next = new Map(prev);
      const max = item.quantity - item.paidQuantity;
      const qty = Math.min(max, Math.max(0, (next.get(item.id) ?? 0) + delta));
      if (qty === 0) next.delete(item.id);
      else next.set(item.id, qty);
      return next;
    });
  }

  function selectAllUnpaid() {
    const next = new Map<string, number>();
    for (const item of items ?? []) {
      const unpaid = item.quantity - item.paidQuantity;
      if (unpaid > 0) next.set(item.id, unpaid);
    }
    setPaySelection(next);
  }

  async function pay(method: "CASH" | "CARD") {
    if (!orderId || paySelection.size === 0) return;
    setPaying(true);
    setError(null);
    const res = await fetch(`/api/panel/orders/${orderId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        itemPayments: [...paySelection.entries()].map(([itemId, quantity]) => ({
          itemId,
          quantity,
        })),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPaySelection(new Map());
      if (data.orderClosed) setPayMode(false);
      load();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Ödeme kaydedilemedi");
    }
    setPaying(false);
  }

  const hasOpenOrder = (items?.length ?? 0) > 0;
  const canAddOrder = orderMode === "WAITER_ONLY";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/panel/${slug}/masalar`} className="text-cream-dim hover:text-cream">
            ←
          </Link>
          <h1 className="text-xl font-semibold">{tableName}</h1>
          <Badge tone={hasOpenOrder ? "gold" : "neutral"}>
            {hasOpenOrder ? "Dolu" : "Boş"}
          </Badge>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Button variant="secondary" onClick={() => setShowQr(true)}>
              QR Kod
            </Button>
          )}
          {canAddOrder && (
            <Button onClick={() => setShowAddSheet(true)}>+ Sipariş</Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Sipariş kalemleri */}
      {items === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Bu masada açık sipariş yok"
          description={canAddOrder ? "Sipariş eklemek için + Sipariş butonunu kullanın." : "Müşteri QR üzerinden sipariş verebilir."}
        />
      ) : (
        <>
          <Card className="p-0">
            <div className="divide-y divide-ink-line">
              {items.map((item) => {
                const unpaid = item.quantity - item.paidQuantity;
                const selected = paySelection.get(item.id) ?? 0;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {item.quantity} × {item.productName}
                      </p>
                      <p className="mt-0.5 text-xs text-cream-dim">
                        {formatKurus(item.unitKurus)} / adet
                        {item.paidQuantity > 0 && (
                          <span className="ml-2 text-ok">
                            {item.paidQuantity} adet ödendi
                          </span>
                        )}
                      </p>
                    </div>

                    {payMode ? (
                      unpaid > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => paySelect(item, -1)}
                            className="h-10 w-10 rounded-lg border border-ink-line text-lg cursor-pointer disabled:opacity-30"
                            disabled={selected === 0}
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-medium">
                            {selected}/{unpaid}
                          </span>
                          <button
                            type="button"
                            onClick={() => paySelect(item, 1)}
                            className="h-10 w-10 rounded-lg border border-ink-line text-lg cursor-pointer disabled:opacity-30"
                            disabled={selected === unpaid}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <Badge tone="ok">Ödendi</Badge>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDelivered(item)}
                          className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                            item.delivered
                              ? "border-ok/40 bg-ok/10 text-ok"
                              : "border-ink-line text-cream-dim hover:text-cream"
                          }`}
                        >
                          {item.delivered ? "Teslim ✓" : "Teslim Et"}
                        </button>
                        {item.paidQuantity === 0 && (
                          <button
                            type="button"
                            aria-label="Kalemi sil"
                            onClick={() => removeItem(item)}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-line text-danger cursor-pointer hover:border-danger/50"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Toplamlar + ödeme */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-6">
                {payMode && (
                  <div>
                    <p className="text-xs text-cream-dim">Seçilenler</p>
                    <p className="text-lg font-semibold text-gold">
                      {formatKurus(totals.selected)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-cream-dim">Kalan Toplam</p>
                  <p className="text-lg font-semibold">
                    {formatKurus(totals.remaining)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-cream-dim">Genel Toplam</p>
                  <p className="text-lg font-semibold text-cream-dim">
                    {formatKurus(totals.total)}
                  </p>
                </div>
              </div>

              {payMode ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={selectAllUnpaid}>
                    Tümünü Seç
                  </Button>
                  <Button
                    disabled={totals.selected === 0 || paying}
                    onClick={() => pay("CASH")}
                  >
                    Nakit Al
                  </Button>
                  <Button
                    disabled={totals.selected === 0 || paying}
                    onClick={() => pay("CARD")}
                  >
                    Kart Al
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPayMode(false);
                      setPaySelection(new Map());
                    }}
                  >
                    Vazgeç
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setPayMode(true)}>Ödeme Al</Button>
              )}
            </div>
          </Card>
        </>
      )}

      {/* QR modal */}
      {showQr && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
          onClick={() => setShowQr(false)}
        >
          <Card className="w-full max-w-xs text-center" >
            <p className="mb-3 font-medium">{tableName} — QR Kod</p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`${tableName} QR`} className="mx-auto rounded-lg" />
            )}
            <p className="mt-3 break-all text-xs text-cream-dim">
              /{slug}/masa/{qrToken}
            </p>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setShowQr(false)}>
              Kapat
            </Button>
          </Card>
        </div>
      )}

      {/* Sipariş ekleme alt paneli */}
      {showAddSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-ink/80 backdrop-blur-sm md:items-center md:justify-center">
          <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-ink-line bg-ink-card md:max-w-2xl md:rounded-2xl">
            <div className="flex items-center justify-between border-b border-ink-line p-4">
              <p className="font-medium">{tableName} — Sipariş Ekle</p>
              <button
                type="button"
                onClick={() => setShowAddSheet(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-cream-dim hover:text-cream cursor-pointer"
              >
                ✕
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="p-6 text-center text-sm text-cream-dim">
                Menüde henüz ürün yok.
              </p>
            ) : (
              <>
                {/* Kategori sekmeleri */}
                <div className="flex gap-2 overflow-x-auto border-b border-ink-line p-3">
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

                {/* Ürünler */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {categories
                      .find((c) => c.id === activeCategory)
                      ?.products.map((p) => {
                        const qty = cart.get(p.id) ?? 0;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 rounded-xl border border-ink-line bg-ink-soft p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-gold">
                                {formatKurus(p.priceKurus)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {qty > 0 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => cartAdd(p.id, -1)}
                                    className="h-11 w-11 rounded-lg border border-ink-line text-lg cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center font-semibold">
                                    {qty}
                                  </span>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => cartAdd(p.id, 1)}
                                className="h-11 w-11 rounded-lg bg-gold text-lg font-bold text-ink cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Sepet özeti */}
                <div className="border-t border-ink-line p-4">
                  <Button
                    className="w-full"
                    disabled={cart.size === 0 || submitting}
                    onClick={submitOrder}
                  >
                    {submitting
                      ? "Gönderiliyor..."
                      : cart.size === 0
                        ? "Ürün seçin"
                        : `Siparişi Gönder · ${formatKurus(cartTotal)}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

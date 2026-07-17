"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatKurus } from "@/lib/utils";
import { useCart } from "@/components/musteri/useCart";
import { CallWaiterButton } from "@/components/musteri/CallWaiterButton";
import { DailyPick } from "@/components/musteri/DailyPick";
import { SuggestionWidget } from "@/components/musteri/SuggestionWidget";
import { MenuList } from "@/components/musteri/MenuList";
import type { PublicMenuCategory, PublicMenuProduct } from "@/lib/public-menu-data";

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
  menuCategories,
  dailyProduct,
  suggestionEnabled,
  loyaltyEnabled,
}: {
  slug: string;
  qrToken: string;
  tableName: string;
  orderMode: "WAITER_ONLY" | "CUSTOMER_QR";
  menuCategories: PublicMenuCategory[];
  dailyProduct: PublicMenuProduct | null;
  suggestionEnabled: boolean;
  loyaltyEnabled: boolean;
}) {
  const canOrder = orderMode === "CUSTOMER_QR";
  const orderToken = canOrder ? qrToken : null;
  const [bill, setBill] = useState<BillItem[] | null>(null);

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

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{tableName}</h1>
          <p className="text-xs text-cream-dim">
            {canOrder
              ? "Menüden seçim yapıp sipariş verebilirsiniz."
              : "Menüyü inceleyebilir, sipariş için garsonunuza seslenebilirsiniz."}
          </p>
        </div>
        <CallWaiterButton qrToken={qrToken} />
      </div>

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

      {dailyProduct && (
        <DailyPick product={dailyProduct} isletmeSlug={slug} masa={qrToken} />
      )}

      {suggestionEnabled && <SuggestionWidget slug={slug} />}

      {menuCategories.length === 0 ? (
        <p className="py-12 text-center text-sm text-cream-dim">Menü henüz hazırlanıyor.</p>
      ) : (
        <MenuList
          isletmeSlug={slug}
          categories={menuCategories}
          qrToken={orderToken}
          loyaltyEnabled={loyaltyEnabled}
          onOrderSubmitted={loadBill}
        />
      )}
    </div>
  );
}

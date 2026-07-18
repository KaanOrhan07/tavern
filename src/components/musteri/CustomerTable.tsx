"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatKurus } from "@/lib/utils";
import { CustomerMenuApp } from "@/components/musteri/CustomerMenuApp";
import type { PublicMenuCategory, PublicMenuProduct } from "@/lib/public-menu-data";

type BillItem = {
  productName: string;
  unitKurus: number;
  quantity: number;
  paidQuantity: number;
  delivered: boolean;
  note?: string | null;
};

export function CustomerTable({
  slug,
  businessName,
  logoUrl,
  bannerUrl,
  qrToken,
  tableName,
  orderMode,
  menuCategories,
  dailyProduct,
  suggestionEnabled,
  loyaltyEnabled,
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  qrToken: string;
  tableName: string;
  orderMode: "WAITER_ONLY" | "CUSTOMER_QR";
  menuCategories: PublicMenuCategory[];
  dailyProduct: PublicMenuProduct | null;
  suggestionEnabled: boolean;
  loyaltyEnabled: boolean;
}) {
  const canOrder = orderMode === "CUSTOMER_QR";
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
    <div>
      {bill !== null && bill.length > 0 && (
        <section className="mb-6 rounded-xl border border-ink-line bg-ink-card">
          <p className="border-b border-ink-line p-4 text-sm font-medium">Hesabınız</p>
          <div className="divide-y divide-ink-line/50">
            {bill.map((item, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm">
                    {item.quantity} × {item.productName}
                  </p>
                  {item.note && (
                    <p className="text-[11px] text-cream-dim">Not: {item.note}</p>
                  )}
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

      <CustomerMenuApp
        slug={slug}
        businessName={businessName}
        logoUrl={logoUrl}
        bannerUrl={bannerUrl}
        qrToken={qrToken}
        canOrder={canOrder}
        tableName={tableName}
        menuCategories={menuCategories}
        dailyProduct={dailyProduct}
        suggestionEnabled={suggestionEnabled}
        loyaltyEnabled={loyaltyEnabled}
        startOnWelcome
        onOrderSubmitted={loadBill}
      />
    </div>
  );
}

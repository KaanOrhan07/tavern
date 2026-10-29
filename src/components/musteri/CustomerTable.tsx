"use client";

import { qrOrderingEnabled, type OrderModeValue } from "@/lib/order-mode";

import { useCallback, useMemo, useState } from "react";
import { formatKurus } from "@/lib/utils";
import { CustomerMenuApp } from "@/components/musteri/CustomerMenuApp";
import type { PublicMenuCategory, PublicMenuProduct } from "@/lib/public-menu-data";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

type BillItem = {
  productName: string;
  unitKurus: number;
  quantity: number;
  paidQuantity: number;
  delivered: boolean;
  status?: string;
  note?: string | null;
};

const STATUS_TR: Record<string, string> = {
  PENDING: "Alındı",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  DELIVERED: "Masana geldi",
  CANCELLED: "İptal",
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
  allergenNote = null,
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  qrToken: string;
  tableName: string;
  orderMode: OrderModeValue;
  menuCategories: PublicMenuCategory[];
  dailyProduct: PublicMenuProduct | null;
  suggestionEnabled: boolean;
  loyaltyEnabled: boolean;
  allergenNote?: string | null;
}) {
  const canOrder = qrOrderingEnabled(orderMode);
  const [bill, setBill] = useState<BillItem[] | null>(null);
  const [reviewEnabled, setReviewEnabled] = useState(false);
  // Hesap görüldükten sonra ödendi/kapandı ise teşekkür + Google yorum kartı gösterilir
  const [sawOrder, setSawOrder] = useState(false);

  const loadBill = useCallback(async () => {
    const res = await fetch(`/api/public/table/${qrToken}`);
    if (res.ok) {
      const data = await res.json();
      const items: BillItem[] = data.order?.items ?? [];
      if (items.length > 0) setSawOrder(true);
      setReviewEnabled(Boolean(data.reviewEnabled));
      setBill(items);
    }
  }, [qrToken]);

  useVisibleInterval(loadBill, 15_000);

  const billTotals = useMemo(() => {
    const list = bill ?? [];
    const total = list.reduce((s, i) => s + i.unitKurus * i.quantity, 0);
    const paid = list.reduce((s, i) => s + i.unitKurus * i.paidQuantity, 0);
    return { total, remaining: total - paid };
  }, [bill]);

  const settled =
    bill !== null &&
    sawOrder &&
    (bill.length === 0 || bill.every((i) => i.paidQuantity >= i.quantity));

  return (
    <div>
      {settled && reviewEnabled && (
        <section className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-center">
          <p className="font-medium">Teşekkürler, afiyet olsun! 🙏</p>
          <p className="mt-1 text-sm text-cream-dim">Deneyiminizi Google&apos;da paylaşırsanız çok seviniriz.</p>
          <a
            href={`/${slug}/yorum`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink"
          >
            ⭐ Google&apos;da Değerlendir
          </a>
        </section>
      )}

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
                    {STATUS_TR[item.status ?? ""] ??
                      (item.delivered ? "Masana geldi" : "Hazırlanıyor")}
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
        allergenNote={allergenNote}
      />
    </div>
  );
}

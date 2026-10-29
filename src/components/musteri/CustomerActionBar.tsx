"use client";

import { useState } from "react";
import { BellRing, Check, Gift, Receipt, ShoppingBag } from "lucide-react";
import { formatKurus } from "@/lib/utils";
import { fetchWithGeo } from "@/lib/geo-client";

export function CustomerActionBar({
  tableName,
  qrToken,
  cartCount,
  cartTotal,
  loyaltyEnabled,
  onViewCart,
  onShowPoints,
}: {
  tableName: string | null;
  qrToken: string | null;
  cartCount: number;
  cartTotal: number;
  loyaltyEnabled: boolean;
  onViewCart: () => void;
  onShowPoints: () => void;
}) {
  const [waiterStatus, setWaiterStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [billStatus, setBillStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function callWaiter() {
    if (!qrToken || waiterStatus === "sending") return;
    setWaiterStatus("sending");
    const { res, geoMessage } = await fetchWithGeo(qrToken, "/api/public/call-waiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    });
    if (!res.ok && geoMessage) alert(geoMessage);
    setWaiterStatus(res.ok ? "sent" : "idle");
    if (res.ok) setTimeout(() => setWaiterStatus("idle"), 15_000);
  }

  async function requestBill() {
    if (!qrToken || billStatus === "sending") return;
    setBillStatus("sending");
    const { res, geoMessage } = await fetchWithGeo(qrToken, "/api/public/request-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    });
    if (!res.ok && geoMessage) alert(geoMessage);
    setBillStatus(res.ok ? "sent" : "idle");
    if (res.ok) setTimeout(() => setBillStatus("idle"), 15_000);
  }

  const chip = (state: "idle" | "sending" | "sent") =>
    `pressable flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium disabled:cursor-not-allowed ${
      state === "sent" ? "border-ok/50 bg-ok/10 text-ok" : "border-ink-line bg-ink-card text-cream"
    }`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto max-w-2xl space-y-2 px-3 pb-3">
        {cartCount > 0 && (
          <button
            type="button"
            onClick={onViewCart}
            className="anim-sheet-up pointer-events-auto pressable flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-gold px-4 text-ink shadow-[var(--shadow-glow)]"
          >
            <span className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-ink/15">
                <ShoppingBag className="h-5 w-5" aria-hidden />
                <span
                  key={cartCount}
                  className="anim-pop tabular absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-gold"
                >
                  {cartCount}
                </span>
              </span>
              <span className="text-sm font-semibold">Sepeti görüntüle</span>
            </span>
            <span className="tabular text-base font-bold">{formatKurus(cartTotal)}</span>
          </button>
        )}

        <div className="glass pointer-events-auto hide-scrollbar flex items-center gap-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-line p-2 shadow-[var(--shadow-2)]">
          {tableName && (
            <span className="flex min-h-11 shrink-0 items-center rounded-full bg-gold/15 px-3.5 text-xs font-bold tracking-wide text-gold">
              {tableName.toUpperCase()}
            </span>
          )}

          {qrToken && (
            <>
              <button type="button" onClick={callWaiter} disabled={waiterStatus !== "idle"} className={chip(waiterStatus)}>
                {waiterStatus === "sent" ? <Check className="h-4 w-4" aria-hidden /> : <BellRing className="h-4 w-4" aria-hidden />}
                {waiterStatus === "sending" ? "Çağrılıyor…" : waiterStatus === "sent" ? "Garson geliyor" : "Garson çağır"}
              </button>
              <button type="button" onClick={requestBill} disabled={billStatus !== "idle"} className={chip(billStatus)}>
                {billStatus === "sent" ? <Check className="h-4 w-4" aria-hidden /> : <Receipt className="h-4 w-4" aria-hidden />}
                {billStatus === "sending" ? "İsteniyor…" : billStatus === "sent" ? "Hesap istendi" : "Hesap iste"}
              </button>
            </>
          )}

          {loyaltyEnabled && (
            <button
              type="button"
              onClick={onShowPoints}
              className="pressable ms-auto flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-gold/50 px-3.5 text-xs font-medium text-gold"
            >
              <Gift className="h-4 w-4" aria-hidden />
              Puanlarım
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { formatKurus } from "@/lib/utils";

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
    const res = await fetch("/api/public/call-waiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    });
    setWaiterStatus(res.ok ? "sent" : "idle");
    if (res.ok) setTimeout(() => setWaiterStatus("idle"), 15_000);
  }

  async function requestBill() {
    if (!qrToken || billStatus === "sending") return;
    setBillStatus("sending");
    const res = await fetch("/api/public/request-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    });
    setBillStatus(res.ok ? "sent" : "idle");
    if (res.ok) setTimeout(() => setBillStatus("idle"), 15_000);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-line bg-ink/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-3 py-2.5">
        {cartCount > 0 && (
          <button
            type="button"
            onClick={onViewCart}
            className="mb-2 flex w-full items-center justify-between rounded-xl bg-gold px-4 py-3 text-ink cursor-pointer"
          >
            <span className="text-sm font-semibold">
              Sepet · {cartCount} ürün
            </span>
            <span className="text-sm font-semibold">
              {formatKurus(cartTotal)} · Görüntüle
            </span>
          </button>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tableName && (
            <span className="shrink-0 rounded-lg border border-ink-line bg-ink-card px-2.5 py-2 text-[11px] font-medium tracking-wide text-cream-dim">
              {tableName.toUpperCase()}
            </span>
          )}

          {qrToken && (
            <>
              <button
                type="button"
                onClick={callWaiter}
                disabled={waiterStatus !== "idle"}
                className={`shrink-0 rounded-lg border px-2.5 py-2 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed ${
                  waiterStatus === "sent"
                    ? "border-ok/40 bg-ok/10 text-ok"
                    : "border-ink-line text-cream-dim"
                }`}
              >
                {waiterStatus === "sending"
                  ? "…"
                  : waiterStatus === "sent"
                    ? "Garson ✓"
                    : "Garson Çağır"}
              </button>
              <button
                type="button"
                onClick={requestBill}
                disabled={billStatus !== "idle"}
                className={`shrink-0 rounded-lg border px-2.5 py-2 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed ${
                  billStatus === "sent"
                    ? "border-ok/40 bg-ok/10 text-ok"
                    : "border-ink-line text-cream-dim"
                }`}
              >
                {billStatus === "sending"
                  ? "…"
                  : billStatus === "sent"
                    ? "Hesap ✓"
                    : "Hesap İste"}
              </button>
            </>
          )}

          {loyaltyEnabled && (
            <button
              type="button"
              onClick={onShowPoints}
              className="ml-auto shrink-0 rounded-lg border border-gold/40 px-2.5 py-2 text-[11px] font-medium text-gold cursor-pointer"
            >
              Puanlarım
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

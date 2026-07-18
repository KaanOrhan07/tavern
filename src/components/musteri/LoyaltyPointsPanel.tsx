"use client";

import { useCallback, useEffect, useState } from "react";
import { useLoyaltyPhone } from "@/components/musteri/LoyaltyCheckout";

export function LoyaltyPointsPanel({
  businessSlug,
  onClose,
}: {
  businessSlug: string;
  onClose: () => void;
}) {
  const { phone, setPhone } = useLoyaltyPhone(businessSlug);
  const [points, setPoints] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(100);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setPoints(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/public/loyalty?slug=${encodeURIComponent(businessSlug)}&phone=${encodeURIComponent(phone)}`
    );
    if (res.ok) {
      const data = await res.json();
      setPoints(data.points);
      setThreshold(data.redeemThresholdPoints);
      setDiscountPercent(data.redeemDiscountPercent);
    } else {
      setPoints(null);
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Puanlar yüklenemedi");
    }
    setLoading(false);
  }, [businessSlug, phone]);

  useEffect(() => {
    const t = setTimeout(fetchBalance, 400);
    return () => clearTimeout(t);
  }, [fetchBalance]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl rounded-t-2xl border border-ink-line bg-ink-card p-5 [animation:sheet-up_0.28s_ease-out]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h2 className="text-lg font-semibold">Puanlarım</h2>
        <p className="mt-1 text-sm text-cream-dim">
          Telefon numaranızla sadakat puan bakiyenizi görün.
        </p>

        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05xx xxx xx xx"
          className="mt-4 w-full rounded-lg border border-ink-line bg-ink px-3 py-2.5 text-sm"
        />

        {loading && <p className="mt-3 text-sm text-cream-dim">Kontrol ediliyor…</p>}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {points !== null && !loading && (
          <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4">
            <p className="text-xs text-cream-dim">Güncel bakiye</p>
            <p className="mt-1 text-3xl font-semibold text-gold">{points}</p>
            <p className="mt-2 text-xs text-cream-dim">
              {threshold} puan ile siparişte %{discountPercent} indirim kullanılabilir.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-ink-line py-3.5 text-sm cursor-pointer"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}

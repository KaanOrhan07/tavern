"use client";

import { useCallback, useEffect, useState } from "react";

function storageKey(businessSlug: string) {
  return `tavern_loyalty_phone_${businessSlug}`;
}

export function useLoyaltyPhone(businessSlug: string) {
  const [phone, setPhoneState] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !businessSlug) return;
    setPhoneState(window.localStorage.getItem(storageKey(businessSlug)) ?? "");
  }, [businessSlug]);

  const setPhone = useCallback(
    (value: string) => {
      setPhoneState(value);
      if (typeof window !== "undefined" && businessSlug) {
        window.localStorage.setItem(storageKey(businessSlug), value);
      }
    },
    [businessSlug]
  );

  return { phone, setPhone };
}

export function LoyaltyCheckout({
  businessSlug,
  subtotalKurus,
  onChange,
}: {
  businessSlug: string;
  subtotalKurus: number;
  onChange: (state: { phone: string; redeem: boolean }) => void;
}) {
  const { phone, setPhone } = useLoyaltyPhone(businessSlug);
  const [redeem, setRedeem] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [canRedeem, setCanRedeem] = useState(false);
  const [threshold, setThreshold] = useState(100);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setPoints(null);
      setCanRedeem(false);
      onChange({ phone, redeem: false });
      return;
    }
    setLoading(true);
    const res = await fetch(
      `/api/public/loyalty?slug=${encodeURIComponent(businessSlug)}&phone=${encodeURIComponent(phone)}`
    );
    if (res.ok) {
      const data = await res.json();
      setPoints(data.points);
      setCanRedeem(data.canRedeem);
      setThreshold(data.redeemThresholdPoints);
      setDiscountPercent(data.redeemDiscountPercent);
      if (!data.canRedeem) setRedeem(false);
      onChange({ phone, redeem: data.canRedeem ? redeem : false });
    } else {
      setPoints(null);
      setCanRedeem(false);
      setRedeem(false);
      onChange({ phone, redeem: false });
    }
    setLoading(false);
  }, [businessSlug, phone, redeem, onChange]);

  useEffect(() => {
    const t = setTimeout(fetchBalance, 400);
    return () => clearTimeout(t);
  }, [fetchBalance]);

  useEffect(() => {
    onChange({ phone, redeem: canRedeem ? redeem : false });
  }, [phone, redeem, canRedeem, onChange]);

  const discountKurus = canRedeem && redeem ? Math.floor((subtotalKurus * discountPercent) / 100) : 0;

  return (
    <div className="mb-3 space-y-2 rounded-xl border border-ink-line bg-ink-card p-3">
      <p className="text-sm font-medium">Sadakat puanları</p>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="05xx xxx xx xx"
        className="w-full rounded-lg border border-ink-line bg-ink px-3 py-2.5 text-sm"
      />
      {loading && <p className="text-xs text-cream-dim">Puanlar kontrol ediliyor...</p>}
      {points !== null && !loading && (
        <p className="text-xs text-cream-dim">
          Mevcut puan: <span className="font-medium text-gold">{points}</span>
        </p>
      )}
      {canRedeem && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={redeem}
            onChange={(e) => setRedeem(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          <span>
            {threshold} puan kullan (%{discountPercent} indirim
            {discountKurus > 0 ? ` · -${(discountKurus / 100).toFixed(2)} ₺` : ""})
          </span>
        </label>
      )}
    </div>
  );
}

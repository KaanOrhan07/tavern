"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = { id: string; fullName: string | null };

/** Menü / randevu ekranlarında hesap girişi kısayolu. */
export function CustomerAccountChip({ returnTo }: { returnTo?: string }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/customer/me")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setProfile(data.profile ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (profile === undefined) return null;

  const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";

  if (profile) {
    const label = profile.fullName?.split(" ")[0] || "Hesabım";
    return (
      <Link
        href="/panel/hesabim"
        className="rounded-full border border-gold/35 bg-ink/55 px-3 py-1.5 text-xs font-medium text-cream backdrop-blur-md hover:border-gold"
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={`/panel/giris-yap${next}`}
      className="rounded-full border border-gold/35 bg-ink/55 px-3 py-1.5 text-xs font-medium text-gold backdrop-blur-md hover:border-gold"
    >
      Giriş yap
    </Link>
  );
}

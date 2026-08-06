"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState } from "@/components/ui";

type Place = {
  businessId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  visitCount: number;
  lastVisitAt: string | null;
  loyaltyPoints: number;
  tierName: string | null;
  isBarber: boolean;
};

type HomeData = {
  profile: {
    id: string;
    phone: string;
    phoneMasked: string;
    fullName: string | null;
    totalVisits: number;
  };
  stats: { businessCount: number; totalPoints: number; totalVisits: number };
  topTier: { tierName: string; businessName: string; businessSlug: string } | null;
  highlights: Place[];
  places: Place[];
};

function PlaceAvatar({ place, size = "md" }: { place: Place; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-14 w-14" : "h-12 w-12";
  if (place.logoUrl) {
    return (
      <span className={`relative ${dim} shrink-0 overflow-hidden rounded-full ring-2 ring-gold/40`}>
        <Image
          src={place.logoUrl}
          alt=""
          fill
          className="object-cover"
          sizes="56px"
          unoptimized={place.logoUrl.startsWith("/api/")}
        />
      </span>
    );
  }
  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-gold/20 text-lg font-semibold text-gold ring-2 ring-gold/40`}
    >
      {place.name.slice(0, 1)}
    </span>
  );
}

export function CustomerHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/public/customer/home");
    if (res.status === 401) {
      router.replace("/panel/giris-yap");
      return;
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Yüklenemedi");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/public/customer/logout", { method: "POST" });
    router.push("/panel/giris-yap");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-cream-dim">Yükleniyor...</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-danger">{error ?? "Hesap bulunamadı"}</p>;
  }

  const { profile, stats, topTier, highlights, places } = data;
  const initial = (profile.fullName || profile.phone).slice(0, 1).toUpperCase();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/20 text-2xl font-semibold text-gold ring-2 ring-gold/50">
            {initial}
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {profile.fullName || "Müşteri"}
            </h1>
            <p className="mt-0.5 text-sm text-cream-dim">{profile.phoneMasked}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={logout}>
          Çıkış
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-ink-line bg-ink-card px-2 py-3">
          <p className="text-lg font-semibold text-gold">{stats.businessCount}</p>
          <p className="text-[11px] text-cream-dim">İşletme</p>
        </div>
        <div className="rounded-xl border border-ink-line bg-ink-card px-2 py-3">
          <p className="text-lg font-semibold text-gold">{stats.totalPoints}</p>
          <p className="text-[11px] text-cream-dim">Puan</p>
        </div>
        <div className="rounded-xl border border-ink-line bg-ink-card px-2 py-3">
          <p className="text-lg font-semibold text-gold">{stats.totalVisits}</p>
          <p className="text-[11px] text-cream-dim">Ziyaret</p>
        </div>
      </div>

      {topTier && (
        <p className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-center text-sm text-gold">
          {topTier.tierName} üye · {topTier.businessName}&apos;da
        </p>
      )}

      {highlights.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-cream-dim">Öne çıkanlar</h2>
          <div className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {highlights.map((p) => (
              <Link
                key={p.businessId}
                href={`/panel/hesabim/${p.slug}`}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <PlaceAvatar place={p} size="sm" />
                <span className="w-full truncate text-center text-[11px] text-cream-dim">
                  {p.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-cream-dim">Gittiğim yerler</h2>
        {places.length === 0 ? (
          <EmptyState
            title="Henüz yer yok"
            description="Sipariş veya randevu tamamladıkça işletmeler burada görünür."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {places.map((p) => (
              <Link key={p.businessId} href={`/panel/hesabim/${p.slug}`}>
                <Card className="flex h-full flex-col items-center gap-2 p-4 text-center transition-colors hover:border-gold/40">
                  <PlaceAvatar place={p} />
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</p>
                  <p className="text-[11px] text-cream-dim">
                    {p.visitCount} ziyaret
                    {p.tierName ? ` · ${p.tierName}` : ""}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

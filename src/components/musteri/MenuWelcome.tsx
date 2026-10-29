"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Info, Navigation, UtensilsCrossed } from "lucide-react";
import { toDisplayImageUrl } from "@/lib/storage-url";

type Category = {
  id: string;
  name: string;
  imageUrl?: string | null;
  icon?: string | null;
  products: unknown[];
};

function CategoryTile({
  category,
  index,
  solo,
  onSelect,
}: {
  category: Category;
  index: number;
  solo: boolean;
  onSelect: () => void;
}) {
  const resolved = category.imageUrl ? toDisplayImageUrl(category.imageUrl) : null;
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(resolved) && !failed;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ ["--i" as string]: Math.min(index, 10) }}
      className={`anim-fade-up pressable group relative isolate flex min-h-[7.5rem] cursor-pointer flex-col justify-end overflow-hidden rounded-3xl border border-white/10 p-3.5 text-start shadow-[var(--shadow-2)] ${
        solo ? "col-span-full" : ""
      }`}
      aria-label={`${category.name} kategorisi, ${category.products.length} ürün`}
    >
      {hasImage ? (
        <Image
          src={resolved!}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={resolved!.startsWith("/api/")}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 -z-10 bg-gradient-to-br from-gold/30 via-ink-card to-ink-soft" />
      )}
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      {!hasImage && (
        <span className="absolute end-3 top-3 text-2xl text-gold/90" aria-hidden>
          {category.icon || <UtensilsCrossed className="h-6 w-6" />}
        </span>
      )}
      <span className="text-[15px] font-semibold leading-snug text-white drop-shadow">{category.name}</span>
      <span className="text-xs text-white/70">{category.products.length} ürün</span>
    </button>
  );
}

export function MenuWelcome({
  businessName,
  slug,
  logoUrl,
  bannerUrl,
  categories,
  onOpenMenu,
  onSelectCategory,
}: {
  businessName: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  categories: Category[];
  onOpenMenu: () => void;
  onSelectCategory: (categoryId: string) => void;
}) {
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [socials, setSocials] = useState<{ label: string; href: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/business-info?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.business) return;
        const b = data.business;
        if (b.mapsUrl) {
          setMapsUrl(b.mapsUrl);
        } else if (b.address) {
          setMapsUrl(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.address)}`);
        }
        const links = [
          { label: "Instagram", href: b.instagramUrl },
          { label: "TikTok", href: b.tiktokUrl },
          { label: "YouTube", href: b.youtubeUrl },
          { label: "Facebook", href: b.facebookUrl },
          { label: "LinkedIn", href: b.linkedinUrl },
          { label: "Web sitesi", href: b.websiteUrl },
        ].filter((l): l is { label: string; href: string } => Boolean(l.href));
        setSocials(links);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug]);
  const resolvedLogo = logoUrl ? toDisplayImageUrl(logoUrl) : null;
  const resolvedBanner = bannerUrl ? toDisplayImageUrl(bannerUrl) : null;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex h-dvh max-h-dvh flex-col overflow-hidden bg-ink text-cream overscroll-none">
      {/* Atmosfer: yavaş yakınlaşan kapak görseli + derin degrade */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {resolvedBanner ? (
          <Image
            src={resolvedBanner}
            alt=""
            fill
            className="object-cover brightness-[0.55] [animation:kenburns_18s_ease-out_forwards]"
            sizes="100vw"
            priority
            unoptimized={resolvedBanner.startsWith("/api/")}
          />
        ) : resolvedLogo ? (
          <Image
            src={resolvedLogo}
            alt=""
            fill
            className="scale-125 object-cover blur-2xl brightness-[0.35]"
            sizes="100vw"
            unoptimized={resolvedLogo.startsWith("/api/")}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-gold)_30%,transparent),transparent_60%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/75 to-ink" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pt-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <header className="anim-fade-up flex shrink-0 flex-col items-center text-center">
          {resolvedLogo ? (
            <Image
              src={resolvedLogo}
              alt={businessName}
              width={88}
              height={88}
              className="h-[5.5rem] w-[5.5rem] rounded-3xl object-cover shadow-[var(--shadow-3)] ring-2 ring-gold/50"
              priority
              unoptimized={resolvedLogo.startsWith("/api/")}
            />
          ) : (
            <div className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-3xl bg-gold/20 text-3xl font-semibold text-gold ring-2 ring-gold/50">
              {businessName.slice(0, 1)}
            </div>
          )}
          <h1 className="mt-4 text-balance text-[1.75rem] leading-tight font-semibold tracking-tight text-cream [font-family:var(--tv-heading-font,inherit)]">
            {businessName}
          </h1>
          <p className="mt-1 text-sm text-cream-dim">Menümüze hoş geldiniz</p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 text-cream backdrop-blur-md hover:bg-black/45"
              >
                <Navigation className="h-4 w-4 text-gold" aria-hidden />
                Yol tarifi
              </a>
            )}
            <a
              href={`/${slug}/bilgi`}
              className="pressable flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 text-cream backdrop-blur-md hover:bg-black/45"
            >
              <Info className="h-4 w-4 text-gold" aria-hidden />
              İşletme bilgisi
            </a>
          </div>
          {socials.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable flex min-h-9 items-center rounded-full px-3 text-xs font-medium text-cream-dim underline-offset-4 hover:text-gold hover:underline"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </header>

        <div className="stagger mt-5 grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto overscroll-contain pb-3 [-webkit-overflow-scrolling:touch] sm:grid-cols-3">
          {categories.length === 0 && (
            <p className="col-span-full mt-6 text-center text-sm text-cream-dim">Menü yakında burada olacak.</p>
          )}
          {categories.map((category, index) => (
            <CategoryTile
              key={category.id}
              category={category}
              index={index}
              solo={categories.length === 1}
              onSelect={() => onSelectCategory(category.id)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenMenu}
          className="anim-fade-up pressable relative z-10 mt-2 flex min-h-14 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gold text-base font-semibold text-ink shadow-[var(--shadow-glow)] hover:bg-gold-light"
        >
          Menüyü gör
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

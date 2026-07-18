"use client";

import { useEffect } from "react";
import Image from "next/image";
import { toDisplayImageUrl } from "@/lib/storage-url";

type Category = { id: string; name: string; products: unknown[] };

const CATEGORY_GLYPHS = ["◎", "◇", "✦", "◈", "○", "△", "□", "✧"];

export function MenuWelcome({
  businessName,
  logoUrl,
  bannerUrl,
  categories,
  onOpenMenu,
  onSelectCategory,
}: {
  businessName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  categories: Category[];
  onOpenMenu: () => void;
  onSelectCategory: (categoryId: string) => void;
}) {
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
      <div className="absolute inset-0 overflow-hidden">
        {resolvedBanner ? (
          <Image
            src={resolvedBanner}
            alt=""
            fill
            className="object-cover scale-105 blur-sm brightness-[0.45]"
            sizes="100vw"
            priority
            unoptimized={resolvedBanner.startsWith("/api/")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-ink-soft via-ink to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex shrink-0 flex-col items-center text-center opacity-0 [animation:menu-fade-up_0.5s_ease-out_forwards]">
          {resolvedLogo ? (
            <Image
              src={resolvedLogo}
              alt={businessName}
              width={80}
              height={80}
              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-gold/40"
              priority
              unoptimized={resolvedLogo.startsWith("/api/")}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gold/20 text-2xl font-semibold text-gold ring-1 ring-gold/40">
              {businessName.slice(0, 1)}
            </div>
          )}
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-cream sm:text-2xl">
            {businessName}
          </h1>
          <p className="mt-1 text-sm text-cream-dim">Menümüze hoş geldiniz</p>
        </div>

        <div className="mt-5 grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto overscroll-contain pb-3 opacity-0 [animation:menu-fade-up_0.65s_ease-out_forwards] [-webkit-overflow-scrolling:touch]">
          {categories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className="flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-gold/25 bg-ink/55 px-2.5 py-3 text-center backdrop-blur-md transition-colors active:bg-ink/70 cursor-pointer"
            >
              <span className="text-lg text-gold" aria-hidden>
                {CATEGORY_GLYPHS[index % CATEGORY_GLYPHS.length]}
              </span>
              <span className="text-sm font-medium leading-snug">{category.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenMenu}
          className="relative z-10 mt-2 w-full shrink-0 rounded-xl bg-gold py-3.5 text-base font-semibold text-ink shadow-[0_8px_30px_rgba(212,168,87,0.25)] transition-transform active:scale-[0.99] cursor-pointer opacity-0 [animation:menu-fade-up_0.8s_ease-out_forwards]"
        >
          Menüyü Gör
        </button>
      </div>
    </div>
  );
}

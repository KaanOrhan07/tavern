"use client";

import Image from "next/image";

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
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink text-cream">
      <div className="absolute inset-0 overflow-hidden">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt=""
            fill
            className="object-cover scale-105 blur-sm brightness-[0.45]"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-ink-soft via-ink to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-12">
        <div className="flex flex-col items-center text-center opacity-0 [animation:menu-fade-up_0.5s_ease-out_forwards]">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
              width={88}
              height={88}
              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-gold/40"
              priority
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gold/20 text-2xl font-semibold text-gold ring-1 ring-gold/40">
              {businessName.slice(0, 1)}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-cream">{businessName}</h1>
          <p className="mt-1.5 text-sm text-cream-dim">Menümüze hoş geldiniz</p>
        </div>

        <div className="mt-8 grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pb-4 opacity-0 [animation:menu-fade-up_0.65s_ease-out_forwards]">
          {categories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-ink/55 px-3 py-4 text-center backdrop-blur-md transition-colors hover:border-gold/50 hover:bg-ink/70 cursor-pointer"
            >
              <span className="text-xl text-gold" aria-hidden>
                {CATEGORY_GLYPHS[index % CATEGORY_GLYPHS.length]}
              </span>
              <span className="text-sm font-medium leading-snug">{category.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenMenu}
          className="relative z-10 mt-auto w-full rounded-xl bg-gold py-4 text-base font-semibold text-ink shadow-[0_8px_30px_rgba(212,168,87,0.25)] transition-transform active:scale-[0.99] cursor-pointer opacity-0 [animation:menu-fade-up_0.8s_ease-out_forwards]"
        >
          Menüyü Gör
        </button>
      </div>
    </div>
  );
}

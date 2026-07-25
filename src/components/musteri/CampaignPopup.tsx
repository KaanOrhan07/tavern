"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Campaign = {
  id: string;
  displayType: "BANNER" | "POPUP";
  imageUrl: string | null;
  targetType: string;
  targetProductId: string | null;
  targetCategoryId: string | null;
  translations: {
    locale: string;
    title: string;
    description: string | null;
    buttonText: string | null;
  }[];
};

const SEEN_KEY = "tavern_campaign_seen";

function pickText(campaign: Campaign, locale: string) {
  const wanted = locale.toUpperCase();
  const t =
    campaign.translations.find((x) => x.locale === wanted) ??
    campaign.translations.find((x) => x.locale === "TR") ??
    campaign.translations[0];
  return {
    title: t?.title ?? "Kampanya",
    description: t?.description ?? null,
    buttonText: t?.buttonText ?? "Görüntüle",
  };
}

export function CampaignPopup({
  slug,
  locale = "TR",
  onSelectCategory,
}: {
  slug: string;
  locale?: string;
  onSelectCategory?: (categoryId: string) => void;
}) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/${encodeURIComponent(slug)}/campaigns`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.campaigns?.length) return;
        const popup = (data.campaigns as Campaign[]).find(
          (c) => c.displayType === "POPUP"
        );
        if (!popup) return;
        try {
          const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || "{}") as Record<
            string,
            boolean
          >;
          if (seen[popup.id]) return;
          setCampaign(popup);
          setOpen(true);
        } catch {
          setCampaign(popup);
          setOpen(true);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function dismiss() {
    if (campaign) {
      try {
        const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || "{}") as Record<
          string,
          boolean
        >;
        seen[campaign.id] = true;
        sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  if (!open || !campaign) return null;

  const text = pickText(campaign, locale);
  const image = campaign.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={text.title}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-ink-line bg-ink-card shadow-xl"
      >
        {image && (
          <div className="relative h-40 w-full">
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="400px"
              unoptimized={image.startsWith("/api/")}
            />
          </div>
        )}
        <div className="space-y-3 p-4">
          <p className="text-lg font-semibold text-cream">{text.title}</p>
          {text.description && (
            <p className="text-sm text-cream-dim">{text.description}</p>
          )}
          <div className="flex gap-2">
            {campaign.targetType === "CATEGORY" &&
              campaign.targetCategoryId &&
              onSelectCategory && (
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-gold px-3 py-2.5 text-sm font-medium text-ink"
                  onClick={() => {
                    onSelectCategory(campaign.targetCategoryId!);
                    dismiss();
                  }}
                >
                  {text.buttonText}
                </button>
              )}
            <button
              type="button"
              className="flex-1 rounded-xl border border-ink-line px-3 py-2.5 text-sm text-cream"
              onClick={dismiss}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

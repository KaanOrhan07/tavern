"use client";

import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toDisplayImageUrl } from "@/lib/storage-url";

const MAX = 8;

export function BookingGallery() {
  const [gallery, setGallery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/panel/booking-gallery")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setGallery(d.gallery))
      .catch(() => undefined);
  }, []);

  async function add(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("image", file);
    const res = await fetch("/api/panel/booking-gallery", { method: "POST", body: fd });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) setGallery(d.gallery);
    else setError(d?.error ?? "Fotoğraf eklenemedi");
    setBusy(false);
  }

  async function remove(url: string) {
    setBusy(true);
    const res = await fetch(`/api/panel/booking-gallery?url=${encodeURIComponent(url)}`, {
      method: "DELETE",
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) setGallery(d.gallery);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-cream-dim">
        Randevu sayfasının üstünde müşterilere gösterilen vitrin fotoğrafları (dükkân, çalışmalar). En fazla {MAX} adet.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {gallery.map((url) => (
          <div key={url} className="relative h-24 w-32 overflow-hidden rounded-xl border border-ink-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toDisplayImageUrl(url)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              disabled={busy}
              aria-label="Fotoğrafı kaldır"
              className="pressable absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-cream hover:bg-danger"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
        {gallery.length < MAX && (
          <label className="pressable flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-line text-cream-dim hover:border-gold hover:text-gold">
            <ImagePlus className="h-5 w-5" aria-hidden />
            <span className="text-xs">{busy ? "Yükleniyor…" : "Fotoğraf ekle"}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) add(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

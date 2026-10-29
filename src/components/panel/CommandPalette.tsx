"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import type { NavEntry } from "@/components/panel/nav-config";

type Hit = { kind: string; id: string; title: string; subtitle: string; href: string };

const KIND_LABEL: Record<string, string> = {
  page: "Sayfalar",
  table: "Masalar",
  product: "Ürünler",
  service: "Hizmetler",
  customer: "Müşteriler",
  appointment: "Randevular",
};

/**
 * Ctrl/⌘+K ile açılan hızlı arama: sayfalar anında (istemci), veriler (ürün/masa/müşteri…) sunucudan.
 * Klavye: ↑↓ gezin, Enter aç, Esc kapat. Esnaf aradığına menüde gezinmeden ulaşır.
 */
export function CommandPalette({
  open,
  onClose,
  base,
  pages,
}: {
  open: boolean;
  onClose: () => void;
  base: string;
  pages: NavEntry[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<Hit[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/panel/search?q=${encodeURIComponent(term)}`, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => setRemote(d.results ?? []))
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q, open]);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    const pageHits = pages
      .filter((p) => !term || `${p.label} ${p.keywords ?? ""}`.toLocaleLowerCase("tr").includes(term))
      .slice(0, term ? 6 : 12)
      .map((p) => ({ kind: "page", id: p.href, title: p.label, subtitle: p.group, href: p.href.replace(base + "/", "") }));
    const rem = term.length >= 2 ? remote : [];
    return [...pageHits, ...rem];
  }, [q, remote, pages, base]);

  const go = useCallback(
    (h: Hit) => {
      onClose();
      router.push(`${base}/${h.href}`);
    },
    [base, onClose, router]
  );

  if (!open) return null;

  const groups: { kind: string; items: { hit: Hit; i: number }[] }[] = [];
  hits.forEach((hit, i) => {
    let g = groups.find((x) => x.kind === hit.kind);
    if (!g) groups.push((g = { kind: hit.kind, items: [] }));
    g.items.push({ hit, i });
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 px-3 pt-[10vh] anim-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hızlı arama"
        className="anim-scale-in w-full max-w-xl overflow-hidden rounded-2xl border border-ink-line bg-ink-card shadow-[var(--shadow-3)]"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            setIdx((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && hits[idx]) {
            e.preventDefault();
            go(hits[idx]);
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-ink-line px-4">
          <Search className="h-5 w-5 shrink-0 text-cream-dim" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            placeholder="Sayfa, ürün, masa, müşteri ara…"
            aria-label="Ara"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-cream outline-none placeholder:text-cream-dim/60"
          />
          <kbd className="hidden rounded border border-ink-line px-1.5 py-0.5 text-[10px] text-cream-dim sm:block">Esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2" role="listbox">
          {hits.length === 0 && <p className="px-3 py-8 text-center text-sm text-cream-dim">Sonuç bulunamadı</p>}
          {groups.map((g) => (
            <div key={g.kind} className="mb-1">
              <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-cream-dim">{KIND_LABEL[g.kind] ?? g.kind}</p>
              {g.items.map(({ hit, i }) => (
                <button
                  key={hit.kind + hit.id}
                  type="button"
                  role="option"
                  aria-selected={i === idx}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(hit)}
                  className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                    i === idx ? "bg-gold/15 text-cream" : "text-cream-dim"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-cream">{hit.title}</span>
                    <span className="block truncate text-xs text-cream-dim">{hit.subtitle}</span>
                  </span>
                  {i === idx && <CornerDownLeft className="h-4 w-4 shrink-0 text-gold" aria-hidden />}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

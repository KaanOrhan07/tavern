"use client";

import { useState } from "react";
import Link from "next/link";

type Suggestion = { productName: string; reason: string; productSlug: string };

export function SuggestionWidget({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuggestions(null);
    const res = await fetch("/api/public/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, query }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      setSuggestions(data.suggestions);
    } else {
      setError(data?.error ?? "Öneri alınamadı, tekrar deneyin");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left cursor-pointer"
        >
          <p className="font-medium text-gold">✨ Bugün ne yesem?</p>
          <p className="mt-0.5 text-xs text-cream-dim">
            Damak zevkinize ve alerjilerinize göre öneri alın.
          </p>
        </button>
      ) : (
        <div className="space-y-3">
          <p className="font-medium text-gold">✨ Bugün ne yesem?</p>
          <form onSubmit={ask} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ör: Hafif bir şey istiyorum, glütene alerjim var"
              className="min-h-11 flex-1 rounded-lg border border-ink-line bg-ink-soft px-3.5 text-sm text-cream placeholder:text-cream-dim/60 outline-none focus:border-gold-dark"
              minLength={2}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-lg bg-gold px-4 text-sm font-semibold text-ink cursor-pointer disabled:opacity-40"
            >
              {loading ? "..." : "Sor"}
            </button>
          </form>
          {error && <p className="text-xs text-danger">{error}</p>}
          {suggestions && suggestions.length === 0 && (
            <p className="text-xs text-cream-dim">Uygun bir öneri bulunamadı.</p>
          )}
          {suggestions && suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <Link
                  key={s.productSlug}
                  href={`/${slug}/menu/${s.productSlug}`}
                  className="block rounded-lg border border-ink-line bg-ink-card p-3 transition-colors hover:border-gold-dark"
                >
                  <p className="text-sm font-medium">{s.productName}</p>
                  <p className="mt-0.5 text-xs text-cream-dim">{s.reason}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

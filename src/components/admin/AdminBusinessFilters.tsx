"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AdminBusinessFilters({
  types,
}: {
  types: { key: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeKey = searchParams.get("type") ?? "";
  const active = searchParams.get("active") ?? "";

  function update(key: "type" | "active", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `/admin/isletmeler?${qs}` : "/admin/isletmeler");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={typeKey}
        onChange={(e) => update("type", e.target.value)}
        className="min-h-11 rounded-lg border border-ink-line bg-ink-soft px-3 text-sm text-cream outline-none focus:border-gold-dark"
      >
        <option value="">Tüm türler</option>
        {types.map((t) => (
          <option key={t.key} value={t.key}>
            {t.name}
          </option>
        ))}
      </select>
      <select
        value={active}
        onChange={(e) => update("active", e.target.value)}
        className="min-h-11 rounded-lg border border-ink-line bg-ink-soft px-3 text-sm text-cream outline-none focus:border-gold-dark"
      >
        <option value="">Tüm durumlar</option>
        <option value="true">Aktif</option>
        <option value="false">Pasif</option>
      </select>
    </div>
  );
}

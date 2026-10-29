"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button, Card, EmptyState, Input, Label, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

type TableSummary = {
  id: string;
  name: string;
  occupied: boolean;
  itemCount: number;
  totalKurus: number;
  remainingKurus: number;
};

type Filter = "all" | "occupied" | "empty";

export function TablesGrid({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const router = useRouter();
  const [tables, setTables] = useState<TableSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/panel/tables");
    if (res.ok) {
      const data = await res.json();
      setTables(data.tables);
    }
  }, []);

  useVisibleInterval(load, 15_000, ["orders", "tables"]);

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/panel/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName("");
      setCreating(false);
      load();
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Masa oluşturulamadı");
    }
  }

  const stats = useMemo(() => {
    const list = tables ?? [];
    const occ = list.filter((t) => t.occupied);
    return { total: list.length, occupied: occ.length, open: occ.reduce((s, t) => s + t.remainingKurus, 0) };
  }, [tables]);

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return (tables ?? []).filter((t) => {
      if (filter === "occupied" && !t.occupied) return false;
      if (filter === "empty" && t.occupied) return false;
      return !term || t.name.toLocaleLowerCase("tr").includes(term);
    });
  }, [tables, filter, q]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Masalar"
        subtitle={
          tables
            ? `${stats.occupied} dolu · ${stats.total - stats.occupied} boş · açık hesap ${formatKurus(stats.open)}`
            : "Yükleniyor…"
        }
        actions={
          isOwner && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Masa ekle
            </Button>
          )
        }
      />

      {creating && (
        <Card className="anim-scale-in">
          <form onSubmit={createTable} className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <Label>Masa Adı</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ör: Masa 5, Bahçe 2"
                autoFocus
                required
              />
            </div>
            <Button type="submit">Oluştur</Button>
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Vazgeç
            </Button>
            {error && <p className="w-full text-sm text-danger">{error}</p>}
          </form>
        </Card>
      )}

      {tables !== null && tables.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-dim" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Masa ara…"
              aria-label="Masa ara"
              className="pl-9"
            />
          </div>
          <Segmented
            label="Masa durumu"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `Hepsi (${stats.total})` },
              { value: "occupied", label: `Dolu (${stats.occupied})` },
              { value: "empty", label: `Boş (${stats.total - stats.occupied})` },
            ]}
          />
        </div>
      )}

      {tables === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          title="Henüz masa yok"
          description={isOwner ? "Yukarıdan ilk masayı ekleyin." : "İşletme sahibi henüz masa eklememiş."}
        />
      ) : shown.length === 0 ? (
        <EmptyState title="Eşleşen masa yok" description="Filtreyi veya aramayı değiştirin." />
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((t, i) => {
            const paid = t.totalKurus > 0 ? Math.round(((t.totalKurus - t.remainingKurus) / t.totalKurus) * 100) : 0;
            return (
              <Link
                key={t.id}
                href={`/panel/${slug}/masalar/${t.id}`}
                style={{ ["--i" as string]: Math.min(i, 12) }}
                className={`pressable relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border p-4 shadow-[var(--shadow-1)] ${
                  t.occupied
                    ? "border-gold/60 bg-gold/10 hover:border-gold"
                    : "border-ink-line bg-ink-card hover:border-cream-dim"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold leading-tight">{t.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      t.occupied ? "bg-gold text-ink" : "bg-ink-soft text-cream-dim"
                    }`}
                  >
                    {t.occupied ? "DOLU" : "BOŞ"}
                  </span>
                </div>
                {t.occupied ? (
                  <div>
                    <p className="tabular text-xl font-bold text-gold">{formatKurus(t.remainingKurus)}</p>
                    <p className="text-xs text-cream-dim">
                      {t.itemCount} kalem{paid > 0 ? ` · %${paid} ödendi` : ""}
                    </p>
                    {paid > 0 && (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-soft" aria-hidden>
                        <div className="h-full rounded-full bg-ok" style={{ width: `${paid}%` }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-cream-dim">Hazır</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

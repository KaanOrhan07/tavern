"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, Input, Label } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type TableSummary = {
  id: string;
  name: string;
  occupied: boolean;
  itemCount: number;
  totalKurus: number;
  remainingKurus: number;
};

export function TablesGrid({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const router = useRouter();
  const [tables, setTables] = useState<TableSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/panel/tables");
    if (res.ok) {
      const data = await res.json();
      setTables(data.tables);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState fetch sonrası çalışır
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Masalar</h1>
        {isOwner && (
          <Button onClick={() => setCreating(true)}>+ Masa Ekle</Button>
        )}
      </div>

      {creating && (
        <Card>
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

      {tables === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : tables.length === 0 ? (
        <EmptyState
          title="Henüz masa yok"
          description={isOwner ? "Yukarıdan ilk masayı ekleyin." : "İşletme sahibi henüz masa eklememiş."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t) => (
            <Link key={t.id} href={`/panel/${slug}/masalar/${t.id}`}>
              <Card
                className={`min-h-28 transition-colors hover:border-gold-dark ${
                  t.occupied ? "border-gold/50 bg-gold/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{t.name}</p>
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      t.occupied ? "bg-gold" : "bg-ink-line"
                    }`}
                  />
                </div>
                {t.occupied ? (
                  <div className="mt-2 space-y-0.5 text-xs text-cream-dim">
                    <p>{t.itemCount} kalem</p>
                    <p className="text-sm font-semibold text-gold">
                      {formatKurus(t.remainingKurus)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-cream-dim">Boş</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

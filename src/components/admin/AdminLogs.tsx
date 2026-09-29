"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";

type Item = {
  id: string;
  adminName: string;
  level: "super" | "sub";
  summary: string;
  ip: string | null;
  createdAt: string;
};

export function AdminLogs() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (search: string, after?: string | null) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (after) params.set("cursor", after);
    const res = await fetch(`/api/admin/logs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => (after && prev ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load("");
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">İşlem Logları</h1>
          <p className="mt-0.5 text-xs text-cream-dim">Tüm adminlerin (ana admin dahil) işlemleri — yalnızca siz görürsünüz.</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(q.trim());
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Admin adı ara" className="w-48" />
          <Button type="submit" variant="secondary">Ara</Button>
        </form>
      </div>

      {items === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : items.length === 0 ? (
        <EmptyState title="Kayıt yok" description="Henüz admin işlemi loglanmadı." />
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <Card key={l.id} className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{l.adminName}</span>{" "}
                    <Badge tone={l.level === "super" ? "gold" : "neutral"}>
                      {l.level === "super" ? "Ana Admin" : "Alt Admin"}
                    </Badge>
                  </p>
                  <p className="mt-1 text-sm text-cream-dim">{l.summary}</p>
                </div>
                <p className="text-xs tabular-nums text-cream-dim">
                  {new Date(l.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            </Card>
          ))}
          {cursor && (
            <Button variant="secondary" disabled={loading} onClick={() => load(q.trim(), cursor)}>
              {loading ? "Yükleniyor..." : "Daha fazla"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

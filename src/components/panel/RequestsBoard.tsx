"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Label, Textarea } from "@/components/ui";

type StaffRequest = {
  id: string;
  text: string;
  status: "PENDING" | "DONE";
  createdByName: string;
  createdAt: string;
};

export function RequestsBoard({
  isOwner,
  requests,
}: {
  isOwner: boolean;
  requests: StaffRequest[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/panel/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      setText("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Talep gönderilemedi");
    }
    setSending(false);
  }

  async function setStatus(id: string, status: "PENDING" | "DONE") {
    await fetch(`/api/panel/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const done = requests.filter((r) => r.status === "DONE");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Talepler</h1>

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Yeni Talep / Not</Label>
            <Textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ör: Bulaşık süngeri lazım"
              required
              minLength={2}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={sending}>
            {sending ? "Gönderiliyor..." : "Gönder"}
          </Button>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="font-medium">
          Bekleyen <Badge tone="warn">{pending.length}</Badge>
        </h2>
        {pending.length === 0 ? (
          <EmptyState title="Bekleyen talep yok" />
        ) : (
          <Card className="p-0">
            <div className="divide-y divide-ink-line">
              {pending.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{r.text}</p>
                    <p className="mt-1 text-xs text-cream-dim">
                      {r.createdByName} ·{" "}
                      {new Date(r.createdAt).toLocaleString("tr-TR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  {isOwner && (
                    <Button variant="secondary" onClick={() => setStatus(r.id, "DONE")}>
                      Karşılandı ✓
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">
            Karşılanan <Badge tone="ok">{done.length}</Badge>
          </h2>
          <Card className="p-0">
            <div className="divide-y divide-ink-line">
              {done.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4 opacity-60">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm line-through">{r.text}</p>
                    <p className="mt-1 text-xs text-cream-dim">{r.createdByName}</p>
                  </div>
                  {isOwner && (
                    <Button variant="ghost" onClick={() => setStatus(r.id, "PENDING")}>
                      Geri Al
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

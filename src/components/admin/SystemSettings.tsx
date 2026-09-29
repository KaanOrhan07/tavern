"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";

type Status = {
  encryptionConfigured: boolean;
  source: "db" | "env" | "none";
  updatedAt: string | null;
  updatedBy: string | null;
};

const SOURCE_LABEL = { db: "Panelden kayıtlı", env: "Sunucu env değişkeni", none: "Tanımlı değil" } as const;

export function SystemSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/settings/groq");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings/groq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      setKey("");
      setMessage({ tone: "ok", text: "Key doğrulandı ve kaydedildi. Anında devrede." });
      await load();
    } else {
      setMessage({ tone: "err", text: (await res.json().catch(() => null))?.error ?? "Kaydedilemedi" });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sistem Ayarları</h1>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium">Groq API Key</p>
          {status && (
            <Badge tone={status.source === "none" ? "danger" : "ok"}>{SOURCE_LABEL[status.source]}</Badge>
          )}
        </div>
        <p className="mb-4 text-xs text-cream-dim">
          AI kalori, tahmin ve menü analizi bu key ile çalışır. Kaydetmeden önce Groq&apos;a doğrulatılır,
          AES-256-GCM ile şifrelenip saklanır; deploy gerekmez.
          {status?.updatedAt && (
            <> Son değişiklik: {new Date(status.updatedAt).toLocaleString("tr-TR")} ({status.updatedBy ?? "—"}).</>
          )}
        </p>
        {status && !status.encryptionConfigured && (
          <p className="mb-3 text-sm text-danger">
            CREDENTIAL_ENCRYPTION_KEY sunucuda tanımlı değil (en az 32 karakter, AUTH_SECRET&apos;tan farklı). Tanımlanana kadar kaydedilemez.
          </p>
        )}
        <form onSubmit={save} className="space-y-3">
          <div>
            <Label>Yeni key</Label>
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="gsk_..." autoComplete="off" />
          </div>
          {message && <p className={message.tone === "ok" ? "text-sm text-gold" : "text-sm text-danger"}>{message.text}</p>}
          <Button type="submit" disabled={busy || key.length < 20 || status?.encryptionConfigured === false}>
            {busy ? "Doğrulanıyor..." : "Kaydet"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

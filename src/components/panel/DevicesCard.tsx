"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

type Device = {
  id: string;
  name: string;
  kind: "PRINT_AGENT" | "DESKTOP" | "MOBILE";
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};
type Job = { id: string; kind: string; status: string; attempts: number; error: string | null; createdAt: string };

const KIND_LABEL = { PRINT_AGENT: "Yazdırma ajanı", DESKTOP: "Masaüstü uygulama", MOBILE: "Mobil uygulama" } as const;
const JOB_TONE: Record<string, "ok" | "warn" | "danger" | "neutral"> = {
  DONE: "ok",
  PENDING: "warn",
  PRINTING: "warn",
  FAILED: "danger",
};

function ago(iso: string | null) {
  if (!iso) return "hiç bağlanmadı";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  if (min < 24 * 60) return `${Math.round(min / 60)} sa önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

/** Ayarlar → Cihazlar: masaüstü/mobil uygulama ve yazdırma ajanı anahtarları + yazdırma kuyruğu durumu. */
export function DevicesCard({ isBarber }: { isBarber: boolean }) {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agentRegistered, setAgentRegistered] = useState(false);
  const [kind, setKind] = useState<Device["kind"]>(isBarber ? "DESKTOP" : "PRINT_AGENT");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<{ token: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([
      fetch("/api/panel/devices").then((r) => (r.ok ? r.json() : null)),
      isBarber ? Promise.resolve(null) : fetch("/api/panel/print").then((r) => (r.ok ? r.json() : null)),
    ]);
    if (d) setDevices(d.devices);
    if (p) {
      setJobs(p.jobs);
      setAgentRegistered(p.agentRegistered);
    }
  }, [isBarber]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/panel/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setNewToken({ token: data.token, name: data.device.name });
      setName("");
      setCopied(false);
      await load();
    } else {
      setError(data?.error ?? "Cihaz eklenemedi");
    }
    setBusy(false);
  }

  async function revoke(d: Device) {
    if (!confirm(`"${d.name}" cihazının anahtarı iptal edilsin mi? Cihaz anında yetkisini kaybeder.`)) return;
    await fetch(`/api/panel/devices/${d.id}`, { method: "DELETE" });
    await load();
  }

  async function testPrint() {
    setError(null);
    const res = await fetch("/api/panel/print", { method: "POST" });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "Test başlatılamadı");
    await load();
  }

  const active = (devices ?? []).filter((d) => !d.revokedAt);

  return (
    <Card>
      <p className="mb-1 font-medium">Cihazlar (Masaüstü · Mobil · Yazdırma)</p>
      <p className="mb-4 text-xs text-cream-dim">
        Tavern masaüstü/mobil uygulamalarını ve mutfak yazıcısı için yazdırma ajanını buradan bağlarsınız. Her cihaz kendi
        anahtarıyla çalışır; kaybolursa tek tıkla iptal edebilirsiniz.
      </p>

      {newToken && (
        <div className="mb-4 rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm">
          <p className="font-medium text-gold">&quot;{newToken.name}&quot; için anahtar — bir daha gösterilmez!</p>
          <p className="mt-1 break-all rounded-lg bg-ink-soft p-2 font-mono text-xs select-all">{newToken.token}</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(newToken.token).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? "Kopyalandı ✓" : "Kopyala"}
            </Button>
            <Button variant="ghost" onClick={() => setNewToken(null)}>
              Kaydettim, kapat
            </Button>
          </div>
        </div>
      )}

      {devices === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : active.length === 0 ? (
        <p className="mb-3 text-sm text-cream-dim">Bağlı cihaz yok.</p>
      ) : (
        <div className="mb-4 divide-y divide-ink-line rounded-xl border border-ink-line">
          {active.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-cream-dim">
                  {KIND_LABEL[d.kind]} · son bağlantı: {ago(d.lastSeenAt)}
                </p>
              </div>
              <Button variant="danger" onClick={() => revoke(d)}>
                İptal et
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label>Cihaz türü</Label>
          <Select value={kind} onChange={(e) => setKind(e.target.value as Device["kind"])}>
            {!isBarber && <option value="PRINT_AGENT">Yazdırma ajanı (mutfak yazıcısı)</option>}
            <option value="DESKTOP">Masaüstü uygulama</option>
            <option value="MOBILE">Mobil uygulama</option>
          </Select>
        </div>
        <div>
          <Label>Cihaz adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ör: Mutfak bilgisayarı" required minLength={2} />
        </div>
        <Button type="submit" disabled={busy}>
          Anahtar oluştur
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {!isBarber && (
        <div className="mt-5 border-t border-ink-line pt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Yazdırma kuyruğu</p>
            <Button variant="secondary" onClick={testPrint} disabled={!agentRegistered}>
              Test fişi gönder
            </Button>
          </div>
          {!agentRegistered && (
            <p className="text-xs text-cream-dim">
              Yazdırma ajanı eklenince yeni siparişlerin mutfak fişi otomatik kuyruğa girer ve ajan yazdırır. Tarayıcıdan
              Bluetooth/USB ile yazdırma çalışmaya devam eder (ikisini birlikte kullanmayın: çift fiş çıkar).
            </p>
          )}
          {jobs.length > 0 && (
            <ul className="space-y-1 text-xs">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-2">
                  <span className="text-cream-dim">
                    {j.kind === "KITCHEN_TICKET" ? "Mutfak fişi" : j.kind === "TEST" ? "Test" : j.kind} ·{" "}
                    {new Date(j.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    {j.error && <span className="text-danger"> · {j.error}</span>}
                  </span>
                  <Badge tone={JOB_TONE[j.status] ?? "neutral"}>{j.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

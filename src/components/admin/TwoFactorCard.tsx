"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";

type Status = { enabled: boolean; setupPending: boolean; bypassActive: boolean };

/** Admin hesabı için iki adımlı doğrulama (TOTP) kurulum / kapatma kartı. */
export function TwoFactorCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/2fa");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, []);

  async function call(body: object) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage({ tone: "err", text: data?.error ?? "İşlem başarısız" });
      return null;
    }
    return data;
  }

  async function startSetup() {
    const data = await call({ action: "setup" });
    if (data) setSetup({ secret: data.secret, qr: data.qr });
  }

  async function enable() {
    const data = await call({ action: "enable", code });
    if (data) {
      setSetup(null);
      setCode("");
      setMessage({ tone: "ok", text: "İki adımlı doğrulama etkinleştirildi. Bir sonraki girişte kod istenecek." });
      await load();
    }
  }

  async function disable() {
    const data = await call({ action: "disable", code });
    if (data) {
      setCode("");
      setMessage({ tone: "ok", text: "İki adımlı doğrulama kapatıldı." });
      await load();
    }
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium">İki Adımlı Doğrulama (2FA)</p>
        {status && <Badge tone={status.enabled ? "ok" : "neutral"}>{status.enabled ? "Etkin" : "Kapalı"}</Badge>}
      </div>
      <p className="mb-4 text-xs text-cream-dim">
        Giriş yaparken anahtarınıza ek olarak telefonunuzdaki doğrulayıcı uygulamanın (Google Authenticator, Microsoft
        Authenticator, Authy) 6 haneli kodu istenir. Anahtarınız çalınsa bile hesabınıza girilemez.
      </p>
      {status?.bypassActive && (
        <p className="mb-3 text-xs text-warn">
          ⚠ ADMIN_TOTP_DISABLE ortam değişkeni açık: 2FA şu an geçici olarak atlanıyor. Kurtarma sonrası değişkeni kaldırın.
        </p>
      )}

      {status && !status.enabled && !setup && (
        <Button onClick={startSetup} disabled={busy}>
          2FA&apos;yı kur
        </Button>
      )}

      {setup && (
        <div className="space-y-3">
          <p className="text-sm">1) Doğrulayıcı uygulamada &quot;QR tara&quot; ile aşağıdaki kodu okutun:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="2FA QR" width={220} height={220} className="rounded-lg bg-white p-2" />
          <p className="text-xs text-cream-dim">
            QR okutamazsanız elle girin: <span className="select-all font-mono">{setup.secret}</span>
          </p>
          <p className="text-sm">2) Uygulamada görünen 6 haneli kodu girin:</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label>Doğrulama kodu</Label>
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-40 text-center tracking-widest"
              />
            </div>
            <Button onClick={enable} disabled={busy || code.length !== 6}>
              Etkinleştir
            </Button>
          </div>
        </div>
      )}

      {status?.enabled && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Kapatmak için güncel kod</Label>
            <Input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-40 text-center tracking-widest"
            />
          </div>
          <Button variant="danger" onClick={disable} disabled={busy || code.length !== 6}>
            2FA&apos;yı kapat
          </Button>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.tone === "ok" ? "text-gold" : "text-danger"}`}>{message.text}</p>
      )}
      <p className="mt-4 text-[11px] text-cream-dim">
        Telefonu kaybederseniz: alt adminler için ana admin &quot;Yöneticiler&quot; sayfasından 2FA&apos;yı sıfırlayabilir; ana admin için Vercel&apos;e
        geçici olarak <span className="font-mono">ADMIN_TOTP_DISABLE=1</span> ekleyip giriş yapın, sonra kaldırıp yeniden kurun.
      </p>
    </Card>
  );
}

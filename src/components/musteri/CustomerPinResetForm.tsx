"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

export function CustomerPinResetForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/public/customer/pin-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "İstek başarısız");
    } else {
      setChallengeToken(data.challengeToken);
      setDebugOtp(data.debugOtp);
      setStep("reset");
    }
    setLoading(false);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/public/customer/pin-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, challengeToken, newPin }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Sıfırlama başarısız");
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/panel/giris-yap"), 1500);
  }

  if (done) {
    return (
      <Card className="space-y-2 p-5">
        <h1 className="text-xl font-semibold">PIN&apos;in güncellendi</h1>
        <p className="text-sm text-cream-dim">Yeni PIN&apos;inle giriş yapabilirsin, yönlendiriliyorsun...</p>
      </Card>
    );
  }

  if (step === "reset") {
    return (
      <Card className="space-y-4 p-5">
        <div>
          <h1 className="text-xl font-semibold">Yeni PIN belirle</h1>
          <p className="mt-1 text-sm text-cream-dim">
            Numara kayıtlıysa SMS ile kod gönderildi. Kodu ve yeni PIN&apos;ini gir.
          </p>
          {debugOtp && (
            <p className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
              Geliştirme kodu: <span className="font-mono tracking-widest">{debugOtp}</span>
            </p>
          )}
        </div>
        <form onSubmit={confirm} className="space-y-3">
          {error && <p className="text-sm text-danger">{error}</p>}
          <div>
            <Label>Doğrulama kodu</Label>
            <Input value={otp} onChange={(e) => setOtp(digits(e.target.value))} inputMode="numeric" required />
          </div>
          <div>
            <Label>Yeni PIN (6 hane)</Label>
            <Input
              value={newPin}
              onChange={(e) => setNewPin(digits(e.target.value))}
              inputMode="numeric"
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" disabled={loading || otp.length !== 6 || newPin.length !== 6} className="w-full">
            {loading ? "Kaydediliyor..." : "PIN'i güncelle"}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h1 className="text-xl font-semibold">PIN&apos;ini mi unuttun?</h1>
        <p className="mt-1 text-sm text-cream-dim">Telefon numaranı gir, SMS ile doğrulama kodu gönderelim.</p>
      </div>
      <form onSubmit={requestCode} className="space-y-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div>
          <Label>Telefon</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xx xxx xx xx"
            inputMode="tel"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Gönderiliyor..." : "Kod gönder"}
        </Button>
      </form>
      <p className="text-sm text-cream-dim">
        <Link href="/panel/giris-yap" className="text-gold hover:underline">
          Girişe dön
        </Link>
      </p>
    </Card>
  );
}

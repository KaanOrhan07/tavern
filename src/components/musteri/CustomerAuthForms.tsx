"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";

export function CustomerLoginForm({ nextPath = "/panel/hesabim" }: { nextPath?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/public/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin, remember }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Giriş başarısız");
      setLoading(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h1 className="text-xl font-semibold">Hesabına giriş yap</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Telefon ve 6 haneli PIN ile giriş. Misafir olarak da sipariş/randevu alabilirsin.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
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
        <div>
          <Label>PIN (6 hane)</Label>
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-cream-dim">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          Beni hatırla (90 gün)
        </label>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Giriş yapılıyor..." : "Giriş yap"}
        </Button>
        <p className="text-center text-sm">
          <Link href="/panel/pin-sifirla" className="text-gold hover:underline">
            PIN&apos;imi unuttum
          </Link>
        </p>
      </form>
      <p className="text-sm text-cream-dim">
        Hesabın yok mu?{" "}
        <Link href={`/panel/kayit-ol?next=${encodeURIComponent(nextPath)}`} className="text-gold hover:underline">
          Kayıt ol
        </Link>
      </p>
    </Card>
  );
}

export function CustomerRegisterForm({ nextPath = "/panel/hesabim" }: { nextPath?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(true);
  const [challengeToken, setChallengeToken] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/public/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin, fullName: fullName || undefined }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Kayıt başarısız");
      setLoading(false);
      return;
    }
    setChallengeToken(data.challengeToken);
    setDebugOtp(data.debugOtp);
    setStep("otp");
    setLoading(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/public/customer/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, challengeToken, remember }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Doğrulama başarısız");
      setLoading(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  if (step === "otp") {
    return (
      <Card className="space-y-4 p-5">
        <div>
          <h1 className="text-xl font-semibold">Telefonu doğrula</h1>
          <p className="mt-1 text-sm text-cream-dim">
            {phone} numarasına gönderilen 6 haneli kodu gir.
          </p>
          {debugOtp && (
            <p className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
              Geliştirme kodu: <span className="font-mono tracking-widest">{debugOtp}</span>
            </p>
          )}
        </div>
        <form onSubmit={verify} className="space-y-3">
          {error && <p className="text-sm text-danger">{error}</p>}
          <div>
            <Label>Doğrulama kodu</Label>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-cream-dim">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            Beni hatırla (90 gün)
          </label>
          <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
            {loading ? "Doğrulanıyor..." : "Hesabı aç"}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h1 className="text-xl font-semibold">Hesap oluştur</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Sadakat puanı, randevu geçmişi ve en sık gittiğin yerler için hesap aç.
        </p>
      </div>
      <form onSubmit={register} className="space-y-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div>
          <Label>Ad Soyad</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
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
        <div>
          <Label>6 haneli PIN</Label>
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            required
          />
          <p className="mt-1 text-[11px] text-cream-dim">Kolay tahmin edilen PIN&apos;ler (123456 vb.) kabul edilmez.</p>
        </div>
        <Button type="submit" disabled={loading || pin.length !== 6} className="w-full">
          {loading ? "Gönderiliyor..." : "Devam et"}
        </Button>
      </form>
      <p className="text-sm text-cream-dim">
        Zaten hesabın var mı?{" "}
        <Link href={`/panel/giris-yap?next=${encodeURIComponent(nextPath)}`} className="text-gold hover:underline">
          Giriş yap
        </Link>
      </p>
    </Card>
  );
}

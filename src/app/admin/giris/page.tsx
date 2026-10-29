"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, TavernLogo } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [password, setPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [needTotp, setNeedTotp] = useState(false);
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, password: password || undefined, totp: totp || undefined }),
    });
    if (res.ok) {
      router.push("/admin/isletmeler");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    if (data?.needTotp) {
      // 2FA etkin hesap: doğrulayıcı uygulamadaki kod istenir
      setNeedTotp(true);
      setError(totp ? (data?.error ?? "Doğrulama kodu hatalı") : null);
      setTotp("");
    } else if (data?.needPassword) {
      // Ana admin şifresizdir; anahtar ana anahtar değilse alt admin şifresi istenir
      setNeedPassword(true);
      setError(null);
    } else {
      setError(data?.error ?? "Giriş başarısız");
    }
    setLoading(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 mt-2">
          <TavernLogo size="md" />
          <p className="mt-2 text-center text-xs text-cream-dim">Yönetici Girişi</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Erişim Anahtarı</Label>
            <Input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setNeedPassword(false);
                setNeedTotp(false);
              }}
              placeholder="Yönetici anahtarınız"
              autoFocus
              required
            />
          </div>
          {needPassword && (
            <div>
              <Label>Şifre</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Alt admin şifreniz"
                autoFocus
                required
              />
            </div>
          )}
          {needTotp && (
            <div>
              <Label>Doğrulama Kodu (2FA)</Label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 haneli kod"
                className="text-center tracking-widest"
                autoFocus
                required
              />
              <p className="mt-1 text-[11px] text-cream-dim">Doğrulayıcı uygulamanızdaki güncel kodu girin.</p>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading || !key} className="w-full">
            {loading ? "Giriş yapılıyor..." : needPassword || needTotp ? "Giriş Yap" : "Devam"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

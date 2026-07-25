"use client";

import { Suspense, use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label, TavernLogo } from "@/components/ui";

function ResetForm({ isletmeSlug }: { isletmeSlug: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/panel/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: isletmeSlug, email }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setMessage(data?.message ?? "E-posta kayıtlıysa sıfırlama bağlantısı gönderildi");
    } else {
      setError(data?.error ?? "İstek gönderilemedi");
    }
    setLoading(false);
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/panel/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      router.push(`/panel/${isletmeSlug}/giris`);
    } else {
      setError(data?.error ?? "Şifre güncellenemedi");
      setLoading(false);
    }
  }

  return (
    <>
      {token ? (
        <form onSubmit={confirmReset} className="space-y-4">
          <div>
            <Label>Yeni şifre</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                required
                placeholder="En az 10 karakter"
              />
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-cream-dim"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Gizle" : "Göster"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-cream-dim">
              En az 10 karakter, bir harf ve bir rakam
            </p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
          </Button>
        </form>
      ) : (
        <form onSubmit={requestReset} className="space-y-4">
          <div>
            <Label>E-posta</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {message && <p className="text-sm text-ok">{message}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
          </Button>
        </form>
      )}
    </>
  );
}

export default function PasswordResetPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = use(params);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 mt-2">
          <TavernLogo size="md" showTagline />
          <p className="mt-2 text-center text-xs text-cream-dim">Şifre Sıfırlama</p>
        </div>
        <Suspense fallback={<p className="text-sm text-cream-dim">Yükleniyor...</p>}>
          <ResetForm isletmeSlug={isletmeSlug} />
        </Suspense>
        <p className="mt-4 text-center text-sm">
          <Link href={`/panel/${isletmeSlug}/giris`} className="text-gold hover:underline">
            Girişe dön
          </Link>
        </p>
      </Card>
    </main>
  );
}

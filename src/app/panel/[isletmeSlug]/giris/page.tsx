"use client";

import { Suspense, use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label, TavernLogo } from "@/components/ui";

function LoginForm({ slug }: { slug: string }) {
  const router = useRouter();
  const search = useSearchParams();
  // Rol seçim ekranından gelen tercih (?rol=owner|staff)
  const [mode, setMode] = useState<"owner" | "staff">(search.get("rol") === "staff" ? "staff" : "owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload =
      mode === "owner"
        ? { mode, slug, email, password, remember }
        : { mode, slug, pin, remember };
    const res = await fetch("/api/panel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(data.redirectPath ?? `/panel/${slug}/dashboard`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Giriş başarısız");
      setLoading(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer ${
      active ? "bg-gold text-ink" : "text-cream-dim hover:text-cream"
    }`;

  return (
    <Card className="w-full max-w-sm">
      <div className="mb-6 mt-2">
        <TavernLogo size="md" />
        <p className="mt-2 text-center text-xs text-cream-dim">{slug} — Panel Girişi</p>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-ink-soft p-1">
        <button type="button" className={tabClass(mode === "owner")} onClick={() => setMode("owner")}>
          İşletme Sahibi
        </button>
        <button type="button" className={tabClass(mode === "staff")} onClick={() => setMode("staff")}>
          Personel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "owner" ? (
          <>
            <div>
              <Label>E-posta</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@isletme.com"
                required
              />
            </div>
            <div>
              <Label>Şifre</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="mt-2 text-end text-xs">
                <Link href={`/panel/${slug}/sifre-sifirla`} className="text-gold hover:underline">
                  Şifremi unuttum
                </Link>
              </p>
            </div>
          </>
        ) : (
          <div>
            <Label>PIN Kodu</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern="\d{4,8}"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4-8 haneli PIN"
              className="text-center text-lg tracking-[0.5em]"
              required
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-cream-dim">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          Beni hatırla (90 gün)
        </label>
        {remember && (
          <p className="text-[11px] text-cream-dim">
            Yalnızca kendi cihazınızda kullanın. Otomatik çıkış devre dışı kalır.
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </form>
    </Card>
  );
}

export default function PanelLoginPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = use(params);
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginForm slug={isletmeSlug} />
      </Suspense>
    </main>
  );
}

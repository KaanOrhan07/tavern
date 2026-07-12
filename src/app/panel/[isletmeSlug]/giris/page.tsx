"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, TavernLogo } from "@/components/ui";

export default function PanelLoginPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = use(params);
  const router = useRouter();
  const [mode, setMode] = useState<"owner" | "staff">("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload =
      mode === "owner"
        ? { mode, slug: isletmeSlug, email, password }
        : { mode, slug: isletmeSlug, pin };
    const res = await fetch("/api/panel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(
        data.role === "staff"
          ? `/panel/${isletmeSlug}/masalar`
          : `/panel/${isletmeSlug}/dashboard`
      );
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
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 mt-2">
          <TavernLogo size="md" showTagline />
          <p className="mt-2 text-center text-xs text-cream-dim">
            {isletmeSlug} — Panel Girişi
          </p>
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
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <Label>PIN Kodu</Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4-6 haneli PIN"
                className="text-center text-lg tracking-[0.5em]"
                required
              />
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

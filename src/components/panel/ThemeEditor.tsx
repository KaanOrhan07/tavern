"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { themeToCssVariables } from "@/lib/themes/css-vars";
import type { ThemePreset } from "@/lib/themes/presets";

type ThemeState = {
  presetKey: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  headingFont: string;
  bodyFont: string;
  cardRadius: number;
  buttonRadius: number;
  animationLevel: string;
  introAnimation: string;
};

const COLOR_FIELDS: { key: keyof ThemeState; label: string }[] = [
  { key: "primaryColor", label: "Ana renk" },
  { key: "accentColor", label: "Vurgu" },
  { key: "backgroundColor", label: "Arka plan" },
  { key: "surfaceColor", label: "Kart yüzeyi" },
  { key: "textColor", label: "Metin" },
  { key: "mutedTextColor", label: "İkincil metin" },
  { key: "borderColor", label: "Kenarlık" },
];

export function ThemeEditor() {
  const [theme, setTheme] = useState<ThemeState | null>(null);
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/panel/theme")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.theme) return;
        setTheme(data.theme);
        setPresets(data.presets ?? []);
      });
  }, []);

  async function save() {
    if (!theme) return;
    setSaving(true);
    setError(null);
    setOk(null);
    const res = await fetch("/api/panel/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) setError(data?.error ?? "Kaydedilemedi");
    else {
      setTheme(data.theme);
      setOk("Tema kaydedildi");
    }
    setSaving(false);
  }

  async function reset() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/panel/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setTheme(data.theme);
      setOk("Varsayılana döndü");
    } else setError(data?.error ?? "Sıfırlanamadı");
    setSaving(false);
  }

  function applyPreset(key: string) {
    const preset = presets.find((p) => p.key === key);
    if (!preset || !theme) return;
    setTheme({ ...theme, ...preset, presetKey: key });
  }

  if (!theme) {
    return <p className="text-sm text-cream-dim">Tema yükleniyor...</p>;
  }

  const previewStyle = themeToCssVariables(theme);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tema</h1>
        <p className="mt-1 text-sm text-cream-dim">
          QR menü görünümünü preset veya renklerle özelleştirin. Kaydetmeden müşteri menüsü değişmez.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-2.5 text-sm text-ok">
          {ok}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <p className="mb-3 font-medium">Hazır stiller</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className={`rounded-xl border px-3 py-3 text-start text-sm transition-colors ${
                    theme.presetKey === p.key
                      ? "border-gold bg-gold/10"
                      : "border-ink-line hover:border-gold-dark"
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="mt-2 flex gap-1">
                    {[p.primaryColor, p.backgroundColor, p.surfaceColor].map((c) => (
                      <span
                        key={c}
                        className="h-4 w-4 rounded-full border border-ink-line"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-3 font-medium">Renkler</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label>{field.label}</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={String(theme[field.key])}
                      onChange={(e) =>
                        setTheme({ ...theme, [field.key]: e.target.value.toUpperCase() })
                      }
                      className="h-11 w-12 cursor-pointer rounded border border-ink-line bg-ink"
                    />
                    <Input
                      value={String(theme[field.key])}
                      onChange={(e) =>
                        setTheme({ ...theme, [field.key]: e.target.value })
                      }
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-3 font-medium">Stil</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Kart yuvarlaklığı</Label>
                <Input
                  type="number"
                  min={0}
                  max={32}
                  value={theme.cardRadius}
                  onChange={(e) =>
                    setTheme({ ...theme, cardRadius: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Buton yuvarlaklığı</Label>
                <Input
                  type="number"
                  min={0}
                  max={32}
                  value={theme.buttonRadius}
                  onChange={(e) =>
                    setTheme({ ...theme, buttonRadius: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Animasyon</Label>
                <select
                  value={theme.animationLevel}
                  onChange={(e) =>
                    setTheme({ ...theme, animationLevel: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm"
                >
                  <option value="none">Kapalı</option>
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <Button variant="secondary" onClick={reset} disabled={saving}>
              Varsayılana dön
            </Button>
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <p className="mb-3 text-sm font-medium">Önizleme</p>
          <div
            className="tavern-theme mx-auto w-full max-w-[240px] overflow-hidden rounded-[1.75rem] border border-ink-line p-3 shadow-lg"
            style={{
              ...previewStyle,
              background: "var(--tv-bg)",
              color: "var(--tv-text)",
            }}
          >
            <div
              className="mb-3 rounded-xl p-3"
              style={{
                background: "var(--tv-surface)",
                borderRadius: "var(--tv-card-radius)",
                border: "1px solid var(--tv-border)",
              }}
            >
              <p className="text-xs" style={{ color: "var(--tv-muted)" }}>
                Menü
              </p>
              <p className="mt-1 font-semibold" style={{ color: "var(--tv-primary)" }}>
                Örnek Kategori
              </p>
              <p className="mt-2 text-sm">Cheeseburger</p>
              <p className="text-xs" style={{ color: "var(--tv-muted)" }}>
                ₺185
              </p>
            </div>
            <button
              type="button"
              className="w-full py-2 text-sm font-medium"
              style={{
                background: "var(--tv-primary)",
                color: "var(--tv-secondary)",
                borderRadius: "var(--tv-button-radius)",
              }}
            >
              Sepete ekle
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

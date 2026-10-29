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

// Öne çıkan tarzların kısa açıklaması (önizleme kartlarında gösterilir)
const PRESET_NOTES: Record<string, string> = {
  glassmorphism: "Buzlu cam, saydam katmanlar",
  minimalism: "Sade, bol boşluk, ince çizgi",
  y2k: "Canlı neon, retro-fütürist",
  luxury: "Zarif, altın vurgu, premium",
};

/** Tek bir tarzın renk/köşe/cam ayarlarıyla küçük canlı önizlemesi. */
function PresetPreview({ p }: { p: ThemePreset }) {
  const glass = p.cardStyle === "glass";
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: p.backgroundColor,
        color: p.textColor,
        borderRadius: Math.max(p.cardRadius, 10),
        padding: 10,
        fontFamily: `"${p.bodyFont}", system-ui, sans-serif`,
      }}
    >
      {glass && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full blur-2xl"
          style={{ background: p.primaryColor, opacity: 0.5 }}
        />
      )}
      <div
        className="relative"
        style={{
          background: glass ? `color-mix(in srgb, ${p.surfaceColor} 55%, transparent)` : p.surfaceColor,
          border: `1px solid ${glass ? `color-mix(in srgb, ${p.textColor} 18%, transparent)` : p.borderColor}`,
          borderRadius: p.cardRadius,
          padding: 10,
          backdropFilter: glass ? "blur(6px)" : undefined,
          WebkitBackdropFilter: glass ? "blur(6px)" : undefined,
        }}
      >
        <p className="text-[10px]" style={{ color: p.mutedTextColor }}>
          Kategori
        </p>
        <p
          className="mt-0.5 text-sm font-semibold leading-tight"
          style={{ color: p.primaryColor, fontFamily: `"${p.headingFont}", Georgia, serif` }}
        >
          Örnek Hizmet
        </p>
        <p className="mt-0.5 text-[11px]" style={{ color: p.mutedTextColor }}>
          ₺250
        </p>
      </div>
      <div
        className="mt-2 py-1.5 text-center text-[11px] font-semibold"
        style={{ background: p.primaryColor, color: p.secondaryColor, borderRadius: p.buttonRadius }}
      >
        Randevu Al
      </div>
    </div>
  );
}

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

  // Önizlemelerde gerçek yazı tiplerini göstermek için preset fontlarını yükle
  const fontFamilies = [...new Set(presets.flatMap((p) => [p.headingFont, p.bodyFont]))];
  const fontsHref =
    fontFamilies.length > 0
      ? `https://fonts.googleapis.com/css2?${fontFamilies
          .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`)
          .join("&")}&display=swap`
      : null;

  return (
    <div className="space-y-6">
      {fontsHref && <link rel="stylesheet" href={fontsHref} precedence="default" />}
      <div>
        <h1 className="text-xl font-semibold">Tema</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Müşteri menüsü ve randevu sayfasının görünümünü hazır tarzlar veya renklerle özelleştirin. Kaydetmeden müşteri tarafı değişmez.
        </p>
        <p className="mt-1 text-xs text-cream-dim">
          Seçtiğiniz tarz yalnızca <span className="text-gold">kendi işletmenizin</span> müşteri sayfalarına uygulanır; başka işletmeleri etkilemez.
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
            <p className="mb-1 font-medium">Hazır tarzlar</p>
            <p className="mb-3 text-xs text-cream-dim">Bir tarza dokunun — sağdaki önizleme ve renkler buna göre ayarlanır. Kaydet ile yayınlanır.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((p) => {
                const selected = theme.presetKey === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    aria-pressed={selected}
                    className={`pressable overflow-hidden rounded-2xl border p-2 text-start transition-colors ${
                      selected ? "border-gold ring-2 ring-gold" : "border-ink-line hover:border-gold-dark"
                    }`}
                  >
                    <PresetPreview p={p} />
                    <div className="mt-2 px-0.5">
                      <p className="flex items-center justify-between text-sm font-medium">
                        {p.name}
                        {selected && <span className="text-xs text-gold">✓ Seçili</span>}
                      </p>
                      {PRESET_NOTES[p.key] && (
                        <p className="text-[11px] text-cream-dim">{PRESET_NOTES[p.key]}</p>
                      )}
                    </div>
                  </button>
                );
              })}
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
              fontFamily: `"${theme.bodyFont}", system-ui, sans-serif`,
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
              <p
                className="mt-1 font-semibold"
                style={{ color: "var(--tv-primary)", fontFamily: `"${theme.headingFont}", Georgia, serif` }}
              >
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

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { ALLERGEN_KEYS, ALLERGENS, allergenIcon, allergenLabel } from "@/lib/allergens";

export type LabelProduct = {
  id: string;
  name: string;
  categoryName: string;
  calories: number | null;
  allergenKeys: string[];
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  containsAlcohol: boolean;
  containsPork: boolean;
  ingredientsText: string | null;
  recipeNames: string[];
  aiApproved: boolean;
  aiPending: boolean;
  suggestAlcohol: string[];
  suggestPork: string[];
};

type Draft = {
  allergenKeys: string[];
  containsAlcohol: boolean;
  containsPork: boolean;
  ingredientsText: string;
  calories: string;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  confirmed: boolean;
};

function toDraft(p: LabelProduct): Draft {
  return {
    allergenKeys: p.allergenKeys,
    containsAlcohol: p.containsAlcohol,
    containsPork: p.containsPork,
    ingredientsText: p.ingredientsText ?? p.recipeNames.join(", "),
    calories: p.calories !== null ? String(p.calories) : "",
    vegan: p.vegan,
    vegetarian: p.vegetarian,
    glutenFree: p.glutenFree,
    confirmed: p.aiApproved,
  };
}

function Editor({
  product,
  mode,
  onDone,
}: {
  product: LabelProduct;
  mode: "review" | "manual";
  onDone: () => void;
}) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => toDraft(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAllergen(key: string) {
    setD((prev) => ({
      ...prev,
      allergenKeys: prev.allergenKeys.includes(key)
        ? prev.allergenKeys.filter((k) => k !== key)
        : [...prev.allergenKeys, key],
    }));
  }

  async function send(action: "approve" | "save" | "reject") {
    if (action === "reject" && !confirm("AI sonucu silinsin mi? (kalori/alerjen/diyet temizlenir)")) return;
    setBusy(true);
    setError(null);
    const cal = d.calories.trim() === "" ? null : Number.parseInt(d.calories, 10);
    const res = await fetch("/api/panel/products/labels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        action,
        ...(action !== "reject" && {
          allergenKeys: d.allergenKeys,
          containsAlcohol: d.containsAlcohol,
          containsPork: d.containsPork,
          ingredientsText: d.ingredientsText.trim() || null,
          calories: cal !== null && Number.isFinite(cal) ? cal : null,
          vegan: d.vegan,
          vegetarian: d.vegetarian || d.vegan,
          glutenFree: d.glutenFree,
          ...(action === "save" && { confirmed: d.confirmed }),
        }),
      }),
    });
    if (res.ok) {
      router.refresh();
      onDone();
    } else {
      setError((await res.json().catch(() => null))?.error ?? "Kaydedilemedi");
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-ink-line bg-ink-soft p-4">
      <div>
        <Label>Alerjenler (AB 14 standart alerjen)</Label>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {ALLERGEN_KEYS.map((k) => {
            const on = d.allergenKeys.includes(k);
            return (
              <label
                key={k}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                  on ? "border-warn/60 bg-warn/10 text-warn" : "border-ink-line text-cream-dim"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleAllergen(k)}
                  className="h-4 w-4 accent-gold"
                />
                <span aria-hidden>{ALLERGENS[k].icon}</span>
                {allergenLabel(k, "TR")}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-line px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={d.containsAlcohol}
            onChange={(e) => setD({ ...d, containsAlcohol: e.target.checked })}
            className="h-4 w-4 accent-gold"
          />
          🍷 Alkol içerir
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-line px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={d.containsPork}
            onChange={(e) => setD({ ...d, containsPork: e.target.checked })}
            className="h-4 w-4 accent-gold"
          />
          🐖 Domuz ürünü içerir
        </label>
      </div>
      {(product.suggestAlcohol.length > 0 && !d.containsAlcohol) && (
        <p className="text-xs text-warn">
          Reçetede alkol olabilecek malzeme var: {product.suggestAlcohol.join(", ")} — işaretlemeyi unutmayın.
        </p>
      )}
      {(product.suggestPork.length > 0 && !d.containsPork) && (
        <p className="text-xs text-warn">
          Reçetede domuz ürünü olabilecek malzeme var: {product.suggestPork.join(", ")} — işaretlemeyi unutmayın.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Kalori (porsiyon)</Label>
          <Input
            inputMode="numeric"
            value={d.calories}
            onChange={(e) => setD({ ...d, calories: e.target.value.replace(/\D/g, "") })}
            placeholder="boş = gösterme"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3 pb-1 text-sm">
          {([
            ["vegan", "Vegan"],
            ["vegetarian", "Vejetaryen"],
            ["glutenFree", "Glutensiz"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={d[k]}
                onChange={(e) => setD({ ...d, [k]: e.target.checked })}
                className="h-4 w-4 accent-gold"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>İçindekiler (müşteriye gösterilir)</Label>
        <Textarea
          rows={2}
          value={d.ingredientsText}
          onChange={(e) => setD({ ...d, ingredientsText: e.target.value })}
          placeholder="Dana kıyma, soğan, tuz, karabiber…"
        />
        <p className="mt-1 text-[11px] text-cream-dim">
          Reçeteden otomatik dolduruldu; stok adlarını müşterinin anlayacağı şekilde düzenleyin.
        </p>
      </div>

      {mode === "manual" && (
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={d.confirmed}
            onChange={(e) => setD({ ...d, confirmed: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-gold"
          />
          <span>
            Bu bilgilerin doğru olduğunu onaylıyorum — müşteriye gösterilsin
            <span className="block text-[11px] text-cream-dim">
              İşaretlemezseniz alerjen/kalori/diyet bilgisi müşteriye gösterilmez (alkol, domuz ve içindekiler her zaman gösterilir).
            </span>
          </span>
        </label>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {mode === "review" ? (
          <>
            <Button type="button" disabled={busy} onClick={() => send("approve")}>
              Onayla ve müşteriye göster
            </Button>
            <Button type="button" variant="danger" disabled={busy} onClick={() => send("reject")}>
              AI sonucunu sil
            </Button>
          </>
        ) : (
          <Button type="button" disabled={busy} onClick={() => send("save")}>
            Kaydet
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onDone}>
          Kapat
        </Button>
      </div>
    </div>
  );
}

/** Menü → AI etiket onayı + tüm ürünlerin içerik bilgileri (alerjen/alkol/domuz/içindekiler). */
export function LabelsReview({ products }: { products: LabelProduct[] }) {
  const pending = useMemo(() => products.filter((p) => p.aiPending), [products]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [showManual, setShowManual] = useState(false);
  const manualProduct = products.find((p) => p.id === manualId) ?? null;

  return (
    <div className="space-y-4">
      <Card className={pending.length > 0 ? "border-warn/50" : ""}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="font-medium">AI Etiket Onayı</p>
          <Badge tone={pending.length > 0 ? "warn" : "ok"}>
            {pending.length > 0 ? `${pending.length} ürün onay bekliyor` : "Bekleyen yok"}
          </Badge>
        </div>
        <p className="mb-3 text-xs text-cream-dim">
          Yapay zekâ kalori, alerjen ve diyet etiketlerini reçeteden hesaplar; <b>siz onaylayana kadar müşteriye gösterilmez</b>.
          Yanlış alerjen bilgisi sağlık riski taşır, bu yüzden her ürünü kontrol edip onaylayın.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-cream-dim">Onay bekleyen etiket yok.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="rounded-xl border border-ink-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-cream-dim">
                      {p.categoryName}
                      {p.calories !== null && ` · ${p.calories} kalori`}
                      {p.allergenKeys.length > 0 &&
                        ` · ${p.allergenKeys.map((k) => `${allergenIcon(k)} ${allergenLabel(k, "TR").split(" (")[0]}`).join(", ")}`}
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                    {openId === p.id ? "Kapat" : "İncele / Onayla"}
                  </Button>
                </div>
                {openId === p.id && <Editor product={p} mode="review" onDone={() => setOpenId(null)} />}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          className="flex w-full cursor-pointer items-center justify-between text-left"
        >
          <span>
            <span className="font-medium">İçerik Bilgileri (alerjen · alkol · domuz · içindekiler)</span>
            <span className="block text-xs text-cream-dim">Herhangi bir ürünün etiketlerini elle düzenleyin.</span>
          </span>
          <span className="text-cream-dim">{showManual ? "▲" : "▼"}</span>
        </button>
        {showManual && (
          <div className="mt-3 space-y-2">
            <Select value={manualId} onChange={(e) => setManualId(e.target.value)}>
              <option value="">Ürün seçin…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.categoryName} · {p.name}
                  {p.aiPending ? " (onay bekliyor)" : p.aiApproved ? "" : " (etiket yok)"}
                </option>
              ))}
            </Select>
            {manualProduct && (
              <Editor key={manualProduct.id} product={manualProduct} mode="manual" onDone={() => setManualId("")} />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

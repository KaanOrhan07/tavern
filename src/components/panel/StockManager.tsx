"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";

type Ingredient = { id: string; name: string; unit: string; quantity: number };

const UNITS = ["g", "kg", "adet", "lt", "ml"];

const LOW_STOCK_THRESHOLD = 5;

export function StockManager({ ingredients }: { ingredients: Ingredient[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", unit: "adet", quantity: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  async function addIngredient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/panel/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        unit: form.unit,
        quantity: Number(form.quantity) || 0,
      }),
    });
    if (res.ok) {
      setForm({ name: "", unit: "adet", quantity: "" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Malzeme eklenemedi");
    }
  }

  async function saveQuantity(id: string) {
    const res = await fetch(`/api/panel/ingredients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Number(editQuantity) || 0 }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Güncellenemedi");
    }
    setEditingId(null);
    router.refresh();
  }

  async function deleteIngredient(ingredient: Ingredient) {
    if (!confirm(`"${ingredient.name}" silinsin mi?`)) return;
    const res = await fetch(`/api/panel/ingredients/${ingredient.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Silinemedi");
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Stok</h1>

      {ingredients.some(
        (i) => i.quantity > 0 && i.quantity <= LOW_STOCK_THRESHOLD
      ) && (
        <p className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm text-warn">
          Düşük stok uyarısı: {ingredients.filter(
            (i) => i.quantity > 0 && i.quantity <= LOW_STOCK_THRESHOLD
          ).length}{" "}
          malzeme kritik seviyede (≤ {LOW_STOCK_THRESHOLD}).
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <form onSubmit={addIngredient} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <Label>Malzeme Adı</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ör: Dana Kıyma"
              required
            />
          </div>
          <div className="w-28">
            <Label>Birim</Label>
            <Select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-32">
            <Label>Mevcut Miktar</Label>
            <Input
              type="number"
              step="any"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0"
            />
          </div>
          <Button type="submit">Ekle</Button>
        </form>
      </Card>

      {ingredients.length === 0 ? (
        <EmptyState
          title="Henüz malzeme yok"
          description="Reçete tanımlamak için önce malzemeleri ekleyin."
        />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-ink-line">
            {ingredients.map((ingredient) => (
              <div key={ingredient.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ingredient.name}</p>
                  <p className="mt-0.5 text-xs text-cream-dim">
                    Birim: {ingredient.unit}
                  </p>
                </div>
                {ingredient.quantity <= 0 ? (
                  <Badge tone="danger">Tükendi</Badge>
                ) : ingredient.quantity <= LOW_STOCK_THRESHOLD ? (
                  <Badge tone="warn">Düşük Stok</Badge>
                ) : null}
                {editingId === ingredient.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="any"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      className="w-28"
                      autoFocus
                    />
                    <Button onClick={() => saveQuantity(ingredient.id)}>Kaydet</Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      İptal
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(ingredient.id);
                        setEditQuantity(String(ingredient.quantity));
                      }}
                      className="rounded-lg border border-ink-line px-4 py-2 text-sm cursor-pointer hover:border-gold-dark"
                    >
                      <span className="font-semibold text-gold">
                        {ingredient.quantity}
                      </span>{" "}
                      {ingredient.unit}
                    </button>
                    <button
                      type="button"
                      aria-label="Malzemeyi sil"
                      onClick={() => deleteIngredient(ingredient)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-line text-danger cursor-pointer hover:border-danger/50"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

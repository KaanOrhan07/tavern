"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import { STOCK_UNITS } from "@/lib/units";
import { toDisplayImageUrl } from "@/lib/storage-url";

type Ingredient = { id: string; name: string; unit: string };
type RecipeRow = { ingredientId: string; amount: number };
type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceKurus: number;
  active: boolean;
  imageUrl?: string | null;
  description?: string | null;
  recipeItems: RecipeRow[];
};

const EMPTY = {
  id: null as string | null,
  name: "",
  durationMinutes: "30",
  price: "",
  description: "",
  imageUrl: null as string | null,
  imageFile: null as File | null,
  recipe: [] as RecipeRow[],
};

export function ServicesManager({
  services: initial,
  ingredients,
  stockEnabled,
}: {
  services: Service[];
  ingredients: Ingredient[];
  stockEnabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setForm(EMPTY);
    setOpen(true);
    setError(null);
  }

  function startEdit(service: Service) {
    setForm({
      id: service.id,
      name: service.name,
      durationMinutes: String(service.durationMinutes),
      price: (service.priceKurus / 100).toFixed(2).replace(".", ","),
      description: service.description ?? "",
      imageUrl: service.imageUrl ?? null,
      imageFile: null,
      recipe: service.recipeItems,
    });
    setOpen(true);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("durationMinutes", form.durationMinutes);
    fd.set("price", form.price);
    fd.set("description", form.description);
    if (form.imageFile) fd.set("image", form.imageFile);
    if (stockEnabled) fd.set("recipe", JSON.stringify(form.recipe.filter((r) => r.ingredientId && r.amount > 0)));

    const res = form.id
      ? await fetch(`/api/panel/services/${form.id}`, { method: "PATCH", body: fd })
      : await fetch("/api/panel/services", { method: "POST", body: fd });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Kaydedilemedi");
    }
    setSaving(false);
  }

  async function toggleActive(service: Service) {
    const fd = new FormData();
    fd.set("active", String(!service.active));
    await fetch(`/api/panel/services/${service.id}`, { method: "PATCH", body: fd });
    router.refresh();
  }

  async function remove(service: Service) {
    if (!confirm(`"${service.name}" silinsin mi?`)) return;
    await fetch(`/api/panel/services/${service.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Hizmetler</h1>
        <Button onClick={startCreate}>+ Yeni Hizmet</Button>
      </div>

      {initial.length === 0 ? (
        <EmptyState title="Henüz hizmet yok" description="Saç kesimi, sakal tıraşı gibi hizmetler ekleyin." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initial.map((service) => (
            <Card key={service.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 gap-3">
                  {service.imageUrl && (
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={toDisplayImageUrl(service.imageUrl)} alt="" className="h-full w-full object-cover" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{service.name}</p>
                    <p className="text-sm text-gold">{formatKurus(service.priceKurus)}</p>
                    <p className="text-xs text-cream-dim">{service.durationMinutes} dakika</p>
                    {!service.active && <Badge tone="danger">Pasif</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" onClick={() => startEdit(service)}>Düzenle</Button>
                  <Button variant="secondary" onClick={() => toggleActive(service)}>
                    {service.active ? "Pasifleştir" : "Aktifleştir"}
                  </Button>
                  <Button variant="secondary" onClick={() => remove(service)}>Sil</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/80 backdrop-blur-sm sm:items-start sm:p-4">
          <Card className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl sm:my-8 sm:max-w-lg sm:rounded-xl">
            <h2 className="mb-4 text-lg font-semibold">{form.id ? "Hizmeti Düzenle" : "Yeni Hizmet"}</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Hizmet Adı</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Kısa Açıklama (randevu kartında görünür)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="ör: Yıkama + kesim + fön"
                  maxLength={80}
                />
              </div>
              <div>
                <Label>Görsel (randevu kartı)</Label>
                <div className="flex items-center gap-3">
                  {(form.imageFile || form.imageUrl) && (
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.imageFile ? URL.createObjectURL(form.imageFile) : toDisplayImageUrl(form.imageUrl!)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] ?? null })}
                    className="block w-full text-sm text-cream-dim file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-ink-soft file:px-3 file:py-2 file:text-sm file:text-cream hover:file:bg-ink-line"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Süre (dakika)</Label>
                  <Input
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    inputMode="numeric"
                    required
                  />
                </div>
                <div>
                  <Label>Fiyat (₺)</Label>
                  <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
              </div>

              {stockEnabled && (
                <div className="rounded-xl border border-ink-line p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Sarf Malzemesi (isteğe bağlı)</Label>
                    <button
                      type="button"
                      className="text-sm text-gold cursor-pointer"
                      onClick={() => setForm((f) => ({ ...f, recipe: [...f.recipe, { ingredientId: "", amount: 0 }] }))}
                    >
                      + Malzeme
                    </button>
                  </div>
                  {form.recipe.map((row, index) => {
                    const unit =
                      ingredients.find((i) => i.id === row.ingredientId)?.unit ?? "";
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] items-center gap-2"
                      >
                        <Select
                          value={row.ingredientId}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              recipe: f.recipe.map((r, i) =>
                                i === index ? { ...r, ingredientId: e.target.value } : r
                              ),
                            }))
                          }
                          className="min-w-0"
                        >
                          <option value="">Malzeme seçin</option>
                          {ingredients.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.unit})
                            </option>
                          ))}
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={row.amount || ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              recipe: f.recipe.map((r, i) =>
                                i === index ? { ...r, amount: Number(e.target.value) } : r
                              ),
                            }))
                          }
                          placeholder="Adet"
                          className="w-full px-2 text-center"
                        />
                        <span className="truncate text-xs text-cream-dim">{unit}</span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-cream-dim">Birimler: {STOCK_UNITS.join(", ")}</p>
                </div>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "..." : "Kaydet"}</Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

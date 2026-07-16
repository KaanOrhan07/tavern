"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Input, Label, Select, Textarea } from "@/components/ui";
import { formatKurus, parseTlToKurus } from "@/lib/utils";
import { ProductImage } from "@/components/musteri/ProductImage";

type Ingredient = { id: string; name: string; unit: string };
type VariantRow = { name: string; price: string };
type RecipeRow = { ingredientId: string; amount: number };
type Product = {
  id: string;
  name: string;
  priceKurus: number;
  imageUrl: string;
  description: string | null;
  active: boolean;
  calories: number | null;
  allergens: string[];
  categoryId: string;
  recipe: RecipeRow[];
  variants: { name: string; priceKurus: number }[];
};
type Category = { id: string; name: string; sortOrder: number; products: Product[] };

const EMPTY_FORM = {
  id: null as string | null,
  name: "",
  price: "",
  description: "",
  categoryId: "",
  recipe: [] as RecipeRow[],
  variants: [] as VariantRow[],
  imageFile: null as File | null,
};

export function MenuManager({
  categories,
  ingredients,
  variantsEnabled,
}: {
  categories: Category[];
  ingredients: Ingredient[];
  variantsEnabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/panel/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory }),
    });
    if (res.ok) {
      setNewCategory("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Kategori eklenemedi");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Kategori silinsin mi?")) return;
    const res = await fetch(`/api/panel/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Kategori silinemedi");
    }
    router.refresh();
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    await fetch(`/api/panel/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", direction }),
    });
    router.refresh();
  }

  function openCreate(categoryId: string) {
    setForm({ ...EMPTY_FORM, categoryId });
    setShowProductForm(true);
    setError(null);
  }

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      price: (product.priceKurus / 100).toFixed(2).replace(".", ","),
      description: product.description ?? "",
      categoryId: product.categoryId,
      recipe: product.recipe,
      variants: product.variants.map((v) => ({
        name: v.name,
        price: (v.priceKurus / 100).toFixed(2).replace(".", ","),
      })),
      imageFile: null,
    });
    setShowProductForm(true);
    setError(null);
  }

  function updateRecipeRow(index: number, patch: Partial<RecipeRow>) {
    setForm((f) => ({
      ...f,
      recipe: f.recipe.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const validRecipe = form.recipe.filter((r) => r.ingredientId && r.amount > 0);
    if (validRecipe.length === 0) {
      setError("Reçete zorunludur: en az bir malzeme ve miktar girin");
      setSaving(false);
      return;
    }

    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("price", form.price);
    fd.set("description", form.description);
    fd.set("categoryId", form.categoryId);
    fd.set("recipe", JSON.stringify(validRecipe));
    if (variantsEnabled) {
      const parsedVariants = form.variants
        .filter((v) => v.name.trim())
        .map((v) => {
          const priceKurus = parseTlToKurus(v.price);
          if (priceKurus === null) return null;
          return { name: v.name.trim(), priceKurus };
        })
        .filter((v): v is { name: string; priceKurus: number } => v !== null);
      fd.set("variants", JSON.stringify(parsedVariants));
    }
    if (form.imageFile) fd.set("image", form.imageFile);

    const res = form.id
      ? await fetch(`/api/panel/products/${form.id}`, { method: "PATCH", body: fd })
      : await fetch("/api/panel/products", { method: "POST", body: fd });

    if (res.ok) {
      const hadRecipe = validRecipe.length > 0;
      setShowProductForm(false);
      setForm(EMPTY_FORM);
      router.refresh();
      // Kalori/alerjen arka planda hesaplanır; birkaç saniye sonra tekrar yenile
      if (hadRecipe) {
        window.setTimeout(() => router.refresh(), 6000);
        window.setTimeout(() => router.refresh(), 15000);
      }
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Ürün kaydedilemedi");
    }
    setSaving(false);
  }

  async function toggleActive(product: Product) {
    const fd = new FormData();
    fd.set("active", String(!product.active));
    await fetch(`/api/panel/products/${product.id}`, { method: "PATCH", body: fd });
    router.refresh();
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`"${product.name}" kalıcı olarak silinsin mi?`)) return;
    await fetch(`/api/panel/products/${product.id}`, { method: "DELETE" });
    router.refresh();
  }

  const btnClass =
    "min-h-11 rounded-lg border border-ink-line px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Menü Yönetimi</h1>

      {error && !showProductForm && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <Label>Yeni Kategori</Label>
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="ör: Ana Yemekler, İçecekler"
              required
            />
          </div>
          <Button type="submit" className="min-h-11">Ekle</Button>
        </form>
      </Card>

      {categories.length === 0 ? (
        <EmptyState
          title="Henüz kategori yok"
          description="Önce bir kategori oluşturun, sonra ürün ekleyin."
        />
      ) : (
        categories.map((category, categoryIndex) => (
          <Card key={category.id}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{category.name}</h2>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={categoryIndex === 0}
                    onClick={() => moveCategory(category.id, "up")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-line text-sm disabled:opacity-30 cursor-pointer hover:border-gold-dark"
                    aria-label="Kategoriyi yukarı taşı"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={categoryIndex === categories.length - 1}
                    onClick={() => moveCategory(category.id, "down")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-line text-sm disabled:opacity-30 cursor-pointer hover:border-gold-dark"
                    aria-label="Kategoriyi aşağı taşı"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="min-h-11" onClick={() => openCreate(category.id)}>
                  + Ürün
                </Button>
                {category.products.length === 0 && (
                  <Button variant="danger" className="min-h-11" onClick={() => deleteCategory(category.id)}>
                    Sil
                  </Button>
                )}
              </div>
            </div>

            {category.products.length === 0 ? (
              <p className="text-sm text-cream-dim">Bu kategoride ürün yok.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {category.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl border border-ink-line bg-ink-soft p-3"
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-16 w-16 shrink-0 rounded-lg bg-ink-soft object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-sm text-gold">{formatKurus(product.priceKurus)}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!product.active && <Badge tone="danger">Pasif</Badge>}
                        {product.calories !== null && (
                          <Badge tone="neutral">~{product.calories} kcal</Badge>
                        )}
                        {product.allergens.length > 0 && (
                          <Badge tone="warn">{product.allergens.length} alerjen</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button type="button" onClick={() => openEdit(product)} className={`${btnClass} hover:border-gold-dark`}>
                        Düzenle
                      </button>
                      <button type="button" onClick={() => toggleActive(product)} className={`${btnClass} text-cream-dim hover:text-cream`}>
                        {product.active ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                      <button type="button" onClick={() => deleteProduct(product)} className={`${btnClass} border-danger/30 text-danger`}>
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}

      {showProductForm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/80 backdrop-blur-sm sm:items-start sm:p-4">
          <Card className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl sm:my-8 sm:max-w-lg sm:rounded-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {form.id ? "Ürünü Düzenle" : "Yeni Ürün"}
            </h2>
            <form onSubmit={saveProduct} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Ürün Adı</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Fiyat (₺)</Label>
                  <Input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="ör: 125,50"
                    inputMode="decimal"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Açıklama (isteğe bağlı)</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Fotoğraf {form.id ? "(değiştirmek için seçin)" : "(zorunlu)"}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] ?? null })}
                  required={!form.id}
                />
              </div>

              <div className="rounded-xl border border-ink-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label>Reçete (malzeme + miktar) — zorunlu</Label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, recipe: [...f.recipe, { ingredientId: "", amount: 0 }] }))}
                    className="text-sm text-gold cursor-pointer min-h-11 px-2"
                  >
                    + Malzeme
                  </button>
                </div>
                {ingredients.length === 0 ? (
                  <p className="text-sm text-warn">Önce Stok sayfasından malzeme tanımlayın.</p>
                ) : form.recipe.length === 0 ? (
                  <p className="text-sm text-cream-dim">Henüz malzeme eklenmedi.</p>
                ) : (
                  <div className="space-y-2">
                    {form.recipe.map((row, index) => {
                      const unit = ingredients.find((i) => i.id === row.ingredientId)?.unit ?? "";
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={row.ingredientId}
                            onChange={(e) => updateRecipeRow(index, { ingredientId: e.target.value })}
                            className="flex-1"
                            required
                          >
                            <option value="">Malzeme seçin</option>
                            {ingredients.map((i) => (
                              <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                            ))}
                          </Select>
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            value={row.amount || ""}
                            onChange={(e) => updateRecipeRow(index, { amount: Number(e.target.value) })}
                            placeholder="Miktar"
                            className="w-28"
                            required
                          />
                          <span className="w-10 text-xs text-cream-dim">{unit}</span>
                          <button
                            type="button"
                            aria-label="Satırı sil"
                            onClick={() => setForm((f) => ({ ...f, recipe: f.recipe.filter((_, i) => i !== index) }))}
                            className="flex h-11 w-11 items-center justify-center text-danger cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-xs text-cream-dim">
                  Reçete miktarı malzeme birimiyle aynıdır (g, ml veya adet). Ör: kahve malzemesi
                  g birimindeyse reçeteye 18 yazın = 18 gram. Kaydettiğinizde kalori ve alerjen
                  bilgisi otomatik hesaplanır.
                </p>
              </div>

              {variantsEnabled && (
                <div className="rounded-xl border border-ink-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Varyantlar (Küçük/Orta/Büyük vb.)</Label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, variants: [...f.variants, { name: "", price: "" }] }))
                      }
                      className="text-sm text-gold cursor-pointer min-h-11 px-2"
                    >
                      + Varyant
                    </button>
                  </div>
                  {form.variants.length === 0 ? (
                    <p className="text-sm text-cream-dim">
                      Varyant yoksa temel fiyat kullanılır.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {form.variants.map((row, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                variants: f.variants.map((v, i) =>
                                  i === index ? { ...v, name: e.target.value } : v
                                ),
                              }))
                            }
                            placeholder="ör: Büyük"
                            className="flex-1"
                          />
                          <Input
                            value={row.price}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                variants: f.variants.map((v, i) =>
                                  i === index ? { ...v, price: e.target.value } : v
                                ),
                              }))
                            }
                            placeholder="Fiyat ₺"
                            inputMode="decimal"
                            className="w-32"
                          />
                          <button
                            type="button"
                            aria-label="Varyantı sil"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                variants: f.variants.filter((_, i) => i !== index),
                              }))
                            }
                            className="flex h-11 w-11 items-center justify-center text-danger cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2 pb-2">
                <Button type="submit" disabled={saving} className="min-h-11 flex-1">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
                <Button type="button" variant="secondary" className="min-h-11" onClick={() => setShowProductForm(false)}>
                  Vazgeç
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

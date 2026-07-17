"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";

export function CreateBusinessForm({
  types,
}: {
  types: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    typeId: types[0]?.id ?? "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", typeId: types[0]?.id ?? "", ownerName: "", ownerEmail: "", ownerPassword: "" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "İşletme oluşturulamadı");
    }
    setLoading(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Yeni İşletme</Button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h2 className="mb-4 text-lg font-semibold">Yeni İşletme</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>İşletme Adı</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ör: Köşk Kafe"
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label>İşletme Türü</Label>
                {types.length === 0 ? (
                  <p className="text-sm text-danger">
                    İşletme türü bulunamadı. Veritabanı migration&apos;ını çalıştırın.
                  </p>
                ) : (
                  <Select
                    value={form.typeId}
                    onChange={(e) => setForm({ ...form, typeId: e.target.value })}
                    required
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <div className="border-t border-ink-line pt-4">
                <p className="mb-3 text-xs font-medium text-cream-dim">
                  İşletme Sahibi Hesabı
                </p>
                <div className="space-y-3">
                  <div>
                    <Label>Ad Soyad</Label>
                    <Input
                      value={form.ownerName}
                      onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>E-posta</Label>
                    <Input
                      type="email"
                      value={form.ownerEmail}
                      onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Geçici Şifre (en az 6 karakter)</Label>
                    <Input
                      type="password"
                      value={form.ownerPassword}
                      onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading || types.length === 0} className="flex-1">
                  {loading ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Vazgeç
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

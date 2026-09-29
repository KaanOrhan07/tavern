"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";

type Row = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  createdByLabel: string | null;
};

const EMPTY = { firstName: "", lastName: "", key: "", password: "", email: "", role: "SUPPORT" };

export function AdminsManager() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setRows((await res.json()).admins);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      setForm(EMPTY);
      await load();
    } else {
      setError((await res.json().catch(() => null))?.error ?? "Oluşturulamadı");
    }
    setBusy(false);
  }

  async function patch(id: string, body: object) {
    const res = await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "İşlem başarısız");
    else setError(null);
    await load();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`${name} adlı alt admin silinsin mi?`)) return;
    await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Yöneticiler</h1>
          <p className="mt-0.5 text-xs text-cream-dim">
            Alt adminler anahtar + şifre ile girer; admin hesabı oluşturamaz, logları ve şifreleri göremez.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Alt Admin</Button>
      </div>
      {error && !open && <p className="text-sm text-danger">{error}</p>}

      {rows === null ? (
        <p className="text-sm text-cream-dim">Yükleniyor...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Alt admin yok" description="Yeni bir alt admin oluşturabilirsiniz." />
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-cream-dim">{a.email}</p>
                  <p className="mt-1 text-xs text-cream-dim">
                    Oluşturan: {a.createdByLabel ?? "—"} · Son giriş:{" "}
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString("tr-TR") : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={a.active ? "ok" : "danger"}>{a.active ? "Aktif" : "Pasif"}</Badge>
                  <Button variant="ghost" onClick={() => patch(a.id, { active: !a.active })}>
                    {a.active ? "Pasifleştir" : "Aktifleştir"}
                  </Button>
                  <Button variant="ghost" onClick={() => setResetId(resetId === a.id ? null : a.id)}>
                    Şifre değiştir
                  </Button>
                  <Button variant="danger" onClick={() => remove(a.id, a.name)}>
                    Sil
                  </Button>
                </div>
              </div>
              {resetId === a.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-line pt-3">
                  <div>
                    <Label>Yeni şifre</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <Button
                    onClick={async () => {
                      await patch(a.id, { password: newPassword });
                      setNewPassword("");
                      setResetId(null);
                    }}
                  >
                    Kaydet
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h2 className="mb-4 text-lg font-semibold">Yeni Alt Admin</h2>
            <form onSubmit={create} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ad</Label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <Label>Soyad</Label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>E-posta</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label>Admin anahtarı (giriş için, benzersiz)</Label>
                <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} minLength={10} required />
              </div>
              <div>
                <Label>Şifre (en az 10 karakter, harf + rakam)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="SUPPORT">Destek</option>
                  <option value="SALES">Satış</option>
                  <option value="FINANCE">Finans</option>
                </Select>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} className="flex-1">
                  {busy ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
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

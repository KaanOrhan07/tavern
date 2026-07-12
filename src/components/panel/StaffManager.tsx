"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Input, Label } from "@/components/ui";

type Staff = { id: string; name: string; pin: string; active: boolean };

export function StaffManager({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", pin: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPin, setEditPin] = useState("");

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/panel/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", pin: "" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Personel eklenemedi");
    }
  }

  async function savePin(id: string) {
    if (!/^\d{4,6}$/.test(editPin)) {
      setError("PIN 4-6 haneli rakam olmalı");
      return;
    }
    const res = await fetch(`/api/panel/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: editPin }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditPin("");
      setError(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "PIN güncellenemedi");
    }
  }

  async function toggleStaff(member: Staff) {
    await fetch(`/api/panel/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !member.active }),
    });
    router.refresh();
  }

  async function deleteStaff(member: Staff) {
    if (!confirm(`"${member.name}" silinsin mi?`)) return;
    await fetch(`/api/panel/staff/${member.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Personeller</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Garsonlar bu PIN ile panele giriş yapar.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <p className="mb-4 font-medium">Yeni Personel Ekle</p>
        <form onSubmit={addStaff} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <Label>Ad Soyad</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ör: Ahmet Yılmaz"
              required
              minLength={2}
            />
          </div>
          <div className="w-40">
            <Label>PIN (4-6 hane)</Label>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              value={form.pin}
              onChange={(e) =>
                setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })
              }
              placeholder="ör: 4821"
              required
              pattern="\d{4,6}"
              className="text-center tracking-widest"
            />
          </div>
          <Button type="submit" className="min-h-11">Ekle</Button>
        </form>
      </Card>

      {staff.length === 0 ? (
        <EmptyState
          title="Henüz personel yok"
          description="Yukarıdan garson hesabı oluşturun."
        />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-ink-line">
            {staff.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{member.name}</p>
                  {editingId === member.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={6}
                        value={editPin}
                        onChange={(e) =>
                          setEditPin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Yeni PIN"
                        className="w-32 text-center tracking-widest"
                        autoFocus
                      />
                      <Button onClick={() => savePin(member.id)}>Kaydet</Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditPin("");
                        }}
                      >
                        İptal
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-cream-dim">
                      PIN: {"•".repeat(member.pin.length)}
                    </p>
                  )}
                </div>
                {!member.active && <Badge tone="danger">Pasif</Badge>}
                {editingId !== member.id && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => {
                        setEditingId(member.id);
                        setEditPin("");
                        setError(null);
                      }}
                    >
                      PIN Değiştir
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => toggleStaff(member)}
                    >
                      {member.active ? "Pasifleştir" : "Aktifleştir"}
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-11"
                      onClick={() => deleteStaff(member)}
                    >
                      Sil
                    </Button>
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

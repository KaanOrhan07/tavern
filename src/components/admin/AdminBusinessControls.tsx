"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Toggle } from "@/components/ui";
import { FEATURES, type FeatureKey } from "@/lib/feature-defs";

export function AdminBusinessControls({
  businessId,
  businessName,
  active,
  featureMap,
  isSuper,
}: {
  businessId: string;
  businessName: string;
  active: boolean;
  featureMap: Record<FeatureKey, boolean>;
  isSuper: boolean;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(active);
  const [features, setFeatures] = useState(featureMap);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ana admin: kimlik bilgileri
  const [creds, setCreds] = useState<{ email: string | null; password: string | null; note: string | null } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [credMsg, setCredMsg] = useState<string | null>(null);

  // Ana admin: kalıcı silme
  const [confirmName, setConfirmName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function toggleActive(value: boolean) {
    setBusy(true);
    setError(null);
    setIsActive(value);
    const res = await fetch(`/api/admin/businesses/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: value }),
    });
    if (!res.ok) {
      setIsActive(!value);
      setError("Durum değiştirilemedi");
    }
    setBusy(false);
    router.refresh();
  }

  async function toggleFeature(featureKey: FeatureKey, enabled: boolean) {
    setError(null);
    setFeatures((prev) => ({ ...prev, [featureKey]: enabled }));
    const res = await fetch(`/api/admin/businesses/${businessId}/features`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey, enabled }),
    });
    if (!res.ok) {
      setFeatures((prev) => ({ ...prev, [featureKey]: !enabled }));
      setError("Özellik değiştirilemedi");
    } else {
      router.refresh();
    }
  }

  async function revealCredentials() {
    setCredMsg(null);
    const res = await fetch(`/api/admin/businesses/${businessId}/credentials`);
    const data = await res.json().catch(() => null);
    if (res.ok) setCreds({ email: data.email, password: data.password, note: data.note });
    else setCredMsg(data?.error ?? "Görüntülenemedi");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setCredMsg(null);
    const res = await fetch(`/api/admin/businesses/${businessId}/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setNewPassword("");
      setCreds(null);
      setCredMsg("Şifre değiştirildi; açık oturumlar sonlandırıldı.");
    } else {
      setCredMsg(data?.error ?? "Şifre değiştirilemedi");
    }
  }

  async function hardDelete() {
    setError(null);
    const res = await fetch(`/api/admin/businesses/${businessId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName }),
    });
    if (res.ok) {
      router.push("/admin/isletmeler");
      router.refresh();
    } else {
      setError((await res.json().catch(() => null))?.error ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">İşletme Durumu</p>
            <p className="mt-0.5 text-xs text-cream-dim">
              Pasif yapılırsa panel, QR menü ve sipariş erişimi kapanır. Veri silinmez; tekrar aktif yapınca her şey kaldığı yerden devam eder.
            </p>
          </div>
          <Toggle checked={isActive} onChange={toggleActive} disabled={busy} />
        </div>
      </Card>

      <Card>
        <p className="mb-1 font-medium">Özellik Bayrakları</p>
        <p className="mb-3 text-xs text-cream-dim">Açık/kapalı durumu işletme panelinde anında yansır.</p>
        <div className="divide-y divide-ink-line">
          {FEATURES.map((f) => (
            <div key={f.key} className="flex items-center justify-between py-3">
              <p className="text-sm">{f.name}</p>
              <Toggle checked={features[f.key]} onChange={(v) => toggleFeature(f.key, v)} />
            </div>
          ))}
        </div>
      </Card>

      {isSuper && (
        <Card>
          <p className="mb-1 font-medium">İşletme Giriş Bilgileri</p>
          <p className="mb-3 text-xs text-cream-dim">Yalnızca ana admin görür. Her görüntüleme ve değişiklik loglanır.</p>
          {creds ? (
            <div className="mb-3 space-y-1 rounded-lg border border-ink-line bg-ink-soft p-3 text-sm">
              <p>E-posta: <span className="select-all font-mono">{creds.email}</span></p>
              <p>
                Şifre:{" "}
                {creds.password ? (
                  <span className="select-all font-mono">{creds.password}</span>
                ) : (
                  <span className="text-cream-dim">{creds.note}</span>
                )}
              </p>
              <Button variant="ghost" onClick={() => setCreds(null)}>Gizle</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={revealCredentials}>E-posta ve şifreyi göster</Button>
          )}
          <form onSubmit={changePassword} className="mt-4 flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <Label>Yeni şifre belirle</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="En az 10 karakter, harf + rakam" />
            </div>
            <Button type="submit" disabled={newPassword.length < 6}>Değiştir</Button>
          </form>
          {credMsg && <p className="mt-2 text-sm text-gold">{credMsg}</p>}
        </Card>
      )}

      {isSuper && (
        <Card className="border-danger/40">
          <p className="mb-1 font-medium text-danger">Tehlikeli Bölge</p>
          <p className="mb-3 text-xs text-cream-dim">
            İşletmeyi kalıcı siler: ürünler, siparişler, personel, randevular dahil tüm veri. Geri alınamaz.
          </p>
          {!deleteOpen ? (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>İşletmeyi kalıcı sil</Button>
          ) : (
            <div className="space-y-2">
              <Label>Onaylamak için işletme adını yazın: <b>{businessName}</b></Label>
              <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="danger" disabled={confirmName.trim() !== businessName} onClick={hardDelete}>
                  Kalıcı olarak sil
                </Button>
                <Button variant="ghost" onClick={() => { setDeleteOpen(false); setConfirmName(""); }}>Vazgeç</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { APP_VERSION } from "@/lib/version";
import { RELEASE_NOTES } from "@/lib/release-notes";
import {
  connectBluetoothPrinter,
  connectUsbPrinter,
  isPrinterConnected,
  isPrinterSupported,
} from "@/lib/printer";

export function SettingsView({
  businessName,
  logoUrl,
  bannerUrl,
  orderMode,
  theme,
  printerEnabled,
  loyaltyEnabled,
  isBarber,
}: {
  businessName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  orderMode: "WAITER_ONLY" | "CUSTOMER_QR";
  theme: "LIGHT" | "DARK";
  printerEnabled: boolean;
  loyaltyEnabled: boolean;
  isBarber: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(orderMode);
  const [menuTheme, setMenuTheme] = useState(theme);
  const [name, setName] = useState(businessName);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bulkMode, setBulkMode] = useState<"percent" | "fixed">("percent");
  const [bulkValue, setBulkValue] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [loyaltySpend, setLoyaltySpend] = useState("100");
  const [loyaltyThreshold, setLoyaltyThreshold] = useState("100");
  const [loyaltyDiscount, setLoyaltyDiscount] = useState("10");
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [printerStatus, setPrinterStatus] = useState<"idle" | "connected" | "error">("idle");
  const [printerSupported, setPrinterSupported] = useState(true);
  const [slotMinutes, setSlotMinutes] = useState<30 | 60>(30);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [savingBarber, setSavingBarber] = useState(false);

  useEffect(() => {
    if (!isBarber) return;
    fetch("/api/panel/barber-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.settings) return;
        setSlotMinutes(data.settings.slotMinutes);
        setOpenTime(data.settings.openTime);
        setCloseTime(data.settings.closeTime);
      });
  }, [isBarber]);

  async function saveBarberSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingBarber(true);
    setError(null);
    const res = await fetch("/api/panel/barber-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotMinutes, openTime, closeTime }),
    });
    if (!res.ok) setError("Randevu ayarları kaydedilemedi");
    else setOkMessage("Randevu ayarları güncellendi");
    setSavingBarber(false);
  }


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı API'si yalnızca mount sonrası okunabilir
    setPrinterSupported(isPrinterSupported());
    setPrinterStatus(isPrinterConnected() ? "connected" : "idle");
  }, []);

  useEffect(() => {
    if (!loyaltyEnabled) return;
    fetch("/api/panel/loyalty")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.config) return;
        setLoyaltySpend(String(data.config.pointsPerSpendKurus));
        setLoyaltyThreshold(String(data.config.redeemThresholdPoints));
        setLoyaltyDiscount(String(data.config.redeemDiscountPercent));
      });
  }, [loyaltyEnabled]);

  async function saveMode(next: "WAITER_ONLY" | "CUSTOMER_QR") {
    setMode(next);
    setError(null);
    const res = await fetch("/api/panel/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderMode: next }),
    });
    if (!res.ok) {
      setMode(orderMode);
      setError("Sipariş modu güncellenemedi");
    }
    router.refresh();
  }

  async function saveTheme(next: "LIGHT" | "DARK") {
    setMenuTheme(next);
    setError(null);
    const res = await fetch("/api/panel/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    });
    if (!res.ok) {
      setMenuTheme(theme);
      setError("Menü teması güncellenemedi");
    }
    router.refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setOkMessage(null);
    const fd = new FormData();
    if (name.trim() && name.trim() !== businessName) fd.set("name", name.trim());
    if (logoFile) fd.set("logo", logoFile);
    if (bannerFile) fd.set("banner", bannerFile);
    if ([...fd.keys()].length === 0) {
      setSavingProfile(false);
      return;
    }
    const res = await fetch("/api/panel/profile", { method: "POST", body: fd });
    if (res.ok) {
      setLogoFile(null);
      setBannerFile(null);
      setOkMessage("Profil güncellendi");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Profil güncellenemedi");
    }
    setSavingProfile(false);
  }

  async function saveLoyalty(e: React.FormEvent) {
    e.preventDefault();
    setSavingLoyalty(true);
    setError(null);
    const res = await fetch("/api/panel/loyalty", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pointsPerSpendKurus: Number(loyaltySpend),
        redeemThresholdPoints: Number(loyaltyThreshold),
        redeemDiscountPercent: Number(loyaltyDiscount),
      }),
    });
    if (!res.ok) setError("Sadakat ayarları kaydedilemedi");
    else setOkMessage("Sadakat ayarları güncellendi");
    setSavingLoyalty(false);
  }

  async function applyBulkPrice(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(bulkValue);
    if (!value || value <= 0) return;
    if (bulkMode === "percent" && value > 100) {
      setError("Yüzde zam en fazla %100 olabilir");
      return;
    }
    if (!confirm(`Tüm ürün fiyatlarına ${bulkMode === "percent" ? `%${value}` : `₺${(value / 100).toFixed(2)}`} zam uygulanacak. Emin misiniz?`)) {
      return;
    }
    setSavingBulk(true);
    setError(null);
    setOkMessage(null);
    const res = await fetch("/api/panel/products/bulk-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: bulkMode,
        value: bulkMode === "percent" ? value : Math.round(value * 100),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setOkMessage(`${data.updated} ürünün fiyatı güncellendi`);
      setBulkValue("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Toplu zam uygulanamadı");
    }
    setSavingBulk(false);
  }

  async function connectPrinter(kind: "bluetooth" | "usb") {
    setError(null);
    try {
      if (kind === "bluetooth") await connectBluetoothPrinter();
      else await connectUsbPrinter();
      setPrinterStatus("connected");
    } catch (e) {
      setPrinterStatus("error");
      setError(
        e instanceof Error && e.name !== "NotFoundError"
          ? `Yazıcı bağlantısı başarısız: ${e.message}`
          : "Yazıcı seçilmedi veya bulunamadı"
      );
    }
  }

  const modeOption = (
    value: "WAITER_ONLY" | "CUSTOMER_QR",
    title: string,
    description: string
  ) => (
    <button
      type="button"
      onClick={() => saveMode(value)}
      className={`w-full rounded-xl border p-4 text-left cursor-pointer transition-colors min-h-11 ${
        mode === value
          ? "border-gold bg-gold/5"
          : "border-ink-line hover:border-gold-dark"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-2 ${
            mode === value ? "border-gold bg-gold" : "border-ink-line"
          }`}
        />
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-cream-dim">{description}</p>
        </div>
      </div>
    </button>
  );

  const themeOption = (value: "LIGHT" | "DARK", title: string, description: string) => (
    <button
      type="button"
      onClick={() => saveTheme(value)}
      className={`w-full rounded-xl border p-4 text-left cursor-pointer transition-colors min-h-11 ${
        menuTheme === value
          ? "border-gold bg-gold/5"
          : "border-ink-line hover:border-gold-dark"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-2 ${
            menuTheme === value ? "border-gold bg-gold" : "border-ink-line"
          }`}
        />
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-cream-dim">{description}</p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ayarlar</h1>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      {okMessage && (
        <p className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-2.5 text-sm text-ok">
          {okMessage}
        </p>
      )}

      <Card>
        <p className="mb-1 font-medium">İşletme Profili</p>
        <p className="mb-4 text-xs text-cream-dim">
          {isBarber
            ? "Müşteri randevu sayfasında görünen ad, logo ve banner."
            : "Müşteri QR menüsünde görünen ad, logo ve banner."}
        </p>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <Label>İşletme Adı</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <Label>Logo</Label>
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={64}
                  height={64}
                  className="mb-2 h-14 w-14 rounded-lg object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="block text-sm text-cream-dim"
              />
            </div>
            <div>
              <Label>Banner</Label>
              {bannerUrl && (
                <Image
                  src={bannerUrl}
                  alt="Banner"
                  width={160}
                  height={64}
                  className="mb-2 h-14 w-40 rounded-lg object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                className="block text-sm text-cream-dim"
              />
            </div>
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Kaydediliyor..." : "Profili Kaydet"}
          </Button>
        </form>
      </Card>

      {!isBarber && (
        <Card>
          <p className="mb-1 font-medium">Toplu Fiyat Artışı</p>
        <p className="mb-4 text-xs text-cream-dim">
          Tüm aktif ürünlere tek seferde zam uygular.
        </p>
        <form onSubmit={applyBulkPrice} className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBulkMode("percent")}
              className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                bulkMode === "percent" ? "border-gold bg-gold/10" : "border-ink-line"
              }`}
            >
              Yüzde (%)
            </button>
            <button
              type="button"
              onClick={() => setBulkMode("fixed")}
              className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                bulkMode === "fixed" ? "border-gold bg-gold/10" : "border-ink-line"
              }`}
            >
              Sabit (₺)
            </button>
          </div>
          <Input
            type="number"
            step="any"
            min={0}
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            placeholder={bulkMode === "percent" ? "ör: 10" : "ör: 5.00"}
            className="w-32"
            required
          />
          <Button type="submit" disabled={savingBulk}>
            {savingBulk ? "Uygulanıyor..." : "Zam Uygula"}
          </Button>
        </form>
      </Card>
      )}

      {!isBarber && loyaltyEnabled && (
        <Card>
          <p className="mb-1 font-medium">Sadakat / Puan Sistemi</p>
          <p className="mb-4 text-xs text-cream-dim">
            Müşteri telefonu ile puan biriktirir; eşik puana ulaşınca indirim kullanabilir.
          </p>
          <form onSubmit={saveLoyalty} className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Puan / harcama (kuruş)</Label>
              <Input
                type="number"
                min={1}
                value={loyaltySpend}
                onChange={(e) => setLoyaltySpend(e.target.value)}
                required
              />
              <p className="mt-1 text-[11px] text-cream-dim">100 = her 1 TL için 1 puan</p>
            </div>
            <div>
              <Label>İndirim eşiği (puan)</Label>
              <Input
                type="number"
                min={1}
                value={loyaltyThreshold}
                onChange={(e) => setLoyaltyThreshold(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>İndirim (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={loyaltyDiscount}
                onChange={(e) => setLoyaltyDiscount(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={savingLoyalty} className="sm:col-span-3">
              {savingLoyalty ? "Kaydediliyor..." : "Sadakat Ayarlarını Kaydet"}
            </Button>
          </form>
        </Card>
      )}

      {isBarber && (
        <Card>
          <p className="mb-1 font-medium">Randevu Ayarları</p>
          <p className="mb-4 text-xs text-cream-dim">
            Çalışma saatleri ve slot süresi müşteri randevu ızgarasını belirler.
          </p>
          <form onSubmit={saveBarberSettings} className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Slot süresi</Label>
              <select
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value) as 30 | 60)}
                className="mt-1 w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm"
              >
                <option value={30}>30 dakika</option>
                <option value={60}>60 dakika</option>
              </select>
            </div>
            <div>
              <Label>Açılış</Label>
              <Input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Kapanış</Label>
              <Input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={savingBarber} className="sm:col-span-3">
              {savingBarber ? "Kaydediliyor..." : "Randevu Ayarlarını Kaydet"}
            </Button>
          </form>
        </Card>
      )}

      {!isBarber && (
      <Card>
        <p className="mb-1 font-medium">Sipariş Modu</p>
        <p className="mb-4 text-xs text-cream-dim">İki mod aynı anda aktif olamaz.</p>
        <div className="space-y-3">
          {modeOption(
            "WAITER_ONLY",
            "Sadece Garson",
            "Müşteri QR ile sadece menüyü görür, siparişi garson girer."
          )}
          {modeOption(
            "CUSTOMER_QR",
            "Müşteri QR Aktif",
            "Müşteri masadaki QR ile kendi siparişini verir."
          )}
        </div>
      </Card>
      )}

      <Card>
        <p className="mb-1 font-medium">{isBarber ? "Müşteri Sayfa Teması" : "Müşteri Menü Teması"}</p>
        <p className="mb-4 text-xs text-cream-dim">
          {isBarber
            ? "Müşterilerin randevu sayfasının rengi. Panel her zaman koyu kalır."
            : "Müşterilerin QR ile açtığı menü sayfasının rengi. Panel her zaman koyu kalır."}
        </p>
        <div className="space-y-3">
          {themeOption("DARK", "Koyu Tema", "Siyah zemin, altın vurgular (varsayılan).")}
          {themeOption("LIGHT", "Açık Tema", "Krem/beyaz zemin, koyu metin.")}
        </div>
      </Card>

      {printerEnabled && !isBarber && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-medium">Mutfak Yazıcısı</p>
            <Badge tone={printerStatus === "connected" ? "ok" : "neutral"}>
              {printerStatus === "connected" ? "Bağlı" : "Bağlı Değil"}
            </Badge>
          </div>
          {!printerSupported ? (
            <p className="text-sm text-warn">
              Bu tarayıcı yazıcı bağlantısını desteklemiyor. Chrome veya Edge kullanın.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="min-h-11" onClick={() => connectPrinter("bluetooth")}>
                Bluetooth ile Bağlan
              </Button>
              <Button variant="secondary" className="min-h-11" onClick={() => connectPrinter("usb")}>
                USB ile Bağlan
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card>
        <p className="mb-1 font-medium">Sürüm Notları</p>
        <div className="mt-3 space-y-4">
          {RELEASE_NOTES.map((note) => (
            <div key={note.version} className="rounded-lg border border-ink-line p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-medium text-cream">v{note.version}</p>
                <p className="text-xs text-cream-dim">{note.date}</p>
                {note.version === APP_VERSION && (
                  <Badge tone="ok">Güncel</Badge>
                )}
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-cream-dim">
                {note.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-1 font-medium">Sistem</p>
        <div className="mt-2 space-y-1 text-sm text-cream-dim">
          <p>
            Sürüm: <span className="font-medium text-cream">Tavern {APP_VERSION}</span>
          </p>
          <p className="text-xs">Created by Digio Medya ve Yazılım</p>
        </div>
      </Card>
    </div>
  );
}

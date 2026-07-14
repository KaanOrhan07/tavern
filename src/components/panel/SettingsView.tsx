"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import {
  connectBluetoothPrinter,
  connectUsbPrinter,
  isPrinterConnected,
  isPrinterSupported,
} from "@/lib/printer";

export function SettingsView({
  orderMode,
  theme,
  printerEnabled,
}: {
  orderMode: "WAITER_ONLY" | "CUSTOMER_QR";
  theme: "LIGHT" | "DARK";
  printerEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(orderMode);
  const [menuTheme, setMenuTheme] = useState(theme);
  const [error, setError] = useState<string | null>(null);
  const [printerStatus, setPrinterStatus] = useState<"idle" | "connected" | "error">("idle");
  const [printerSupported, setPrinterSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı API'si yalnızca mount sonrası okunabilir
    setPrinterSupported(isPrinterSupported());
    setPrinterStatus(isPrinterConnected() ? "connected" : "idle");
  }, []);

  async function saveMode(next: "WAITER_ONLY" | "CUSTOMER_QR") {
    setMode(next);
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
            "Müşteri masadaki QR ile kendi siparişini verir. Garson sipariş giremez ama masaları görebilir."
          )}
        </div>
      </Card>

      <Card>
        <p className="mb-1 font-medium">Müşteri Menü Teması</p>
        <p className="mb-4 text-xs text-cream-dim">
          Müşterilerin QR ile açtığı menü sayfasının rengi. Panel her zaman koyu kalır.
        </p>
        <div className="space-y-3">
          {themeOption("DARK", "Koyu Tema", "Siyah zemin, altın vurgular (varsayılan).")}
          {themeOption("LIGHT", "Açık Tema", "Krem/beyaz zemin, koyu metin.")}
        </div>
      </Card>

      {printerEnabled && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-medium">Mutfak Yazıcısı</p>
            <Badge tone={printerStatus === "connected" ? "ok" : "neutral"}>
              {printerStatus === "connected" ? "Bağlı" : "Bağlı Değil"}
            </Badge>
          </div>
          {!printerSupported ? (
            <p className="text-sm text-warn">
              Bu tarayıcı yazıcı bağlantısını desteklemiyor. Chrome veya Edge kullanın
              (iOS Safari desteklenmez).
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-cream-dim">
                Termal yazıcınızı Bluetooth veya USB ile bağlayın. Garson siparişi
                girildiğinde mutfak fişi otomatik basılır.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="min-h-11" onClick={() => connectPrinter("bluetooth")}>
                  Bluetooth ile Bağlan
                </Button>
                <Button variant="secondary" className="min-h-11" onClick={() => connectPrinter("usb")}>
                  USB ile Bağlan
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

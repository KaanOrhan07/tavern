"use client";

import { useRef, useState } from "react";
import { Button, Card } from "@/components/ui";

type Report = {
  dryRun: boolean;
  created: number;
  updated: number;
  categoriesCreated: number;
  errors: { row: number; message: string }[];
};

const linkBtn =
  "inline-flex min-h-11 items-center rounded-lg border border-ink-line bg-ink-card px-4 py-2.5 text-sm text-cream hover:border-gold-dark";

/** Ayarlar → Menü Excel: mevcut menüyü indir, şablonu indir, Excel'den toplu yükle (önce önizleme). */
export function MenuExcelCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function send(dryRun: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("dryRun", dryRun ? "1" : "0");
    try {
      const res = await fetch("/api/panel/menu-excel", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Yükleme başarısız");
        setReport(null);
      } else {
        setReport(data);
        if (!dryRun) {
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
        }
      }
    } catch {
      setError("Bağlantı hatası, tekrar deneyin");
    }
    setBusy(false);
  }

  return (
    <Card>
      <p className="mb-1 font-medium">Menü Excel (Toplu Aktarım)</p>
      <p className="mb-4 text-xs text-cream-dim">
        Menünüzü Excel&apos;de hazırlayıp tek seferde yükleyin ya da mevcut menüyü indirip toplu düzenleyin. Fotoğraf ve reçete
        Excel&apos;den eklenmez; aktardıktan sonra Menü sayfasından ekleyebilirsiniz.
      </p>

      <div className="flex flex-wrap gap-2">
        <a href="/api/panel/menu-excel" download className={linkBtn}>
          ⬇ Mevcut menüyü indir
        </a>
        <a href="/api/panel/menu-excel?template=1" download className={linkBtn}>
          ⬇ Boş şablonu indir
        </a>
      </div>

      <div className="mt-4 space-y-3 border-t border-ink-line pt-4">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setReport(null);
            setError(null);
          }}
          className="block text-sm text-cream-dim"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={!file || busy} onClick={() => send(true)}>
            {busy ? "Kontrol ediliyor..." : "Önizle (kaydetmez)"}
          </Button>
          <Button
            type="button"
            disabled={!file || busy || !report || !report.dryRun || report.created + report.updated === 0}
            onClick={() => send(false)}
          >
            İçe aktar
          </Button>
        </div>
        <p className="text-[11px] text-cream-dim">Önce &quot;Önizle&quot; ile hataları görün; sonra &quot;İçe aktar&quot; açılır. Silme yapılmaz.</p>

        {error && <p className="text-sm text-danger">{error}</p>}

        {report && (
          <div className="rounded-lg border border-ink-line bg-ink-soft p-3 text-sm">
            <p className={report.dryRun ? "text-gold" : "text-ok"}>
              {report.dryRun ? "Önizleme: " : "İçe aktarıldı: "}
              {report.created} yeni ürün, {report.updated} güncelleme, {report.categoriesCreated} yeni kategori
            </p>
            {report.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-warn">{report.errors.length} satır atlandı:</p>
                <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto ps-5 text-xs text-cream-dim">
                  {report.errors.map((e, i) => (
                    <li key={i}>
                      Satır {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

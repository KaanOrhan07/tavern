"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Button, Card } from "@/components/ui";

export function CustomerPublicLink({
  slug,
  path,
  title,
  description,
}: {
  slug: string;
  path: string;
  title: string;
  description: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(`/${slug}${path}`);

  useEffect(() => {
    const url = `${window.location.origin}/${slug}${path}`;
    setPublicUrl(url);
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#0A0A0A", light: "#F5EFE0" },
    }).then(setQrDataUrl);
  }, [slug, path]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }

  return (
    <Card>
      <p className="mb-1 font-medium">{title}</p>
      <p className="mb-4 text-xs text-cream-dim">{description}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {qrDataUrl && (
          <Image
            src={qrDataUrl}
            alt="Müşteri QR kodu"
            width={160}
            height={160}
            className="mx-auto h-40 w-40 rounded-lg border border-ink-line bg-cream p-2 sm:mx-0"
          />
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <p className="break-all rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm text-cream">
            {publicUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="min-h-11" onClick={copyLink}>
              {copied ? "Kopyalandı" : "Linki Kopyala"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
            >
              Sayfayı Aç
            </Button>
          </div>
          <p className="text-xs text-cream-dim">
            Kısa adres: <span className="text-cream">/{slug}</span> — otomatik yönlendirir.
          </p>
        </div>
      </div>
    </Card>
  );
}

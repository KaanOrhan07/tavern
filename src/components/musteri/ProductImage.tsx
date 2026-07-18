"use client";

import { useState } from "react";
import { toDisplayImageUrl } from "@/lib/storage-url";

/** Ürün fotoğrafı bulunamazsa/yüklenemezse gösterilecek basit yer tutucu. */
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%232a2622'/%3E%3Cpath d='M18 42l9-11 7 8 6-7 6 10H18z' fill='%23554d42'/%3E%3Ccircle cx='24' cy='22' r='5' fill='%23554d42'/%3E%3C/svg%3E";

export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const resolved = toDisplayImageUrl(src);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const showPlaceholder = !resolved || failedFor === resolved;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={resolved}
      src={showPlaceholder ? PLACEHOLDER_IMAGE : resolved}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailedFor(resolved)}
    />
  );
}

const BUCKET = "product-images";

/** Tarayıcıda her zaman çalışan uygulama proxy URL'si. */
export function mediaProxyUrl(path: string) {
  return `/api/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Eski kayıtlardaki doğrudan Supabase public URL'sini proxy'ye çevirir (mümkünse).
 * Zaten proxy veya yabancı URL ise olduğu gibi bırakır.
 */
export function toDisplayImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith("/api/public/media/")) return imageUrl;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return imageUrl;

  const path = imageUrl.slice(idx + marker.length).split("?")[0];
  if (!path) return imageUrl;
  try {
    return mediaProxyUrl(decodeURIComponent(path));
  } catch {
    return imageUrl;
  }
}

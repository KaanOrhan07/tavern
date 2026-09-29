/**
 * Google Maps işletme linkinden koordinat çıkarma.
 * SSRF koruması: yalnızca Google alan adlarına, yalnızca https ile gidilir; her yönlendirme adımı tekrar doğrulanır.
 */
const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "www.google.com.tr",
  "google.com.tr",
  "maps.google.com.tr",
]);

const COORD_PATTERNS = [
  /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
  /[?&](?:q|ll|query|destination|center)=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i,
];

const MAX_HOPS = 5;

export type MapsResolveResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; error: string };

export const MAPS_LINK_ERROR = "Geçerli bir Google Maps linki yapıştırın";

function isAllowedUrl(u: URL) {
  return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname.toLowerCase());
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function extractCoords(text: string): { latitude: number; longitude: number } | null {
  for (const re of COORD_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const latitude = Number(m[1]);
    const longitude = Number(m[2]);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    ) {
      return { latitude, longitude };
    }
  }
  return null;
}

export async function resolveMapsLink(input: string): Promise<MapsResolveResult> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: MAPS_LINK_ERROR };
  }
  if (!isAllowedUrl(url)) return { ok: false, error: MAPS_LINK_ERROR };

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const direct = extractCoords(safeDecode(url.toString()));
    if (direct) return { ok: true, ...direct };

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TavernBot/2.2)", "Accept-Language": "tr" },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      return { ok: false, error: "Google Maps linkine ulaşılamadı, tekrar deneyin" };
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        break;
      }
      // Google bazen izin (consent) sayfasına yönlendirir; asıl link `continue=` içinde durur
      const viaConsent = extractCoords(safeDecode(next.toString()));
      if (viaConsent) return { ok: true, ...viaConsent };
      if (!isAllowedUrl(next)) break;
      url = next;
      continue;
    }

    if (res.ok) {
      // Yönlendirme yok: sayfa içeriğinde koordinat ara (ilk 300 KB)
      const html = (await res.text()).slice(0, 300_000);
      const found = extractCoords(html);
      if (found) return { ok: true, ...found };
    }
    break;
  }
  return { ok: false, error: MAPS_LINK_ERROR };
}

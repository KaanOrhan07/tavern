import { APP_VERSION } from "@/lib/version";

/**
 * Native uygulama (masaüstü / mobil) uyumluluk kontrolü.
 * İstemci her istekte `X-Tavern-App: desktop|mobile` ve `X-Tavern-App-Version: 1.2.3` gönderir.
 * Sunucu tarafında MIN_APP_VERSION_DESKTOP / MIN_APP_VERSION_MOBILE env'leri ile zorunlu güncelleme sürümü belirlenir.
 */
export type AppKind = "desktop" | "mobile";

export const API_VERSION = "v1";

/** "1.10.2" biçimli sürümleri karşılaştırır: a<b → -1, a=b → 0, a>b → 1 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function minAppVersions(): Record<AppKind, string> {
  return {
    desktop: process.env.MIN_APP_VERSION_DESKTOP || "0.0.0",
    mobile: process.env.MIN_APP_VERSION_MOBILE || "0.0.0",
  };
}

export function appInfoFromRequest(request: Request): { kind: AppKind | null; version: string | null } {
  const kind = request.headers.get("x-tavern-app");
  const version = request.headers.get("x-tavern-app-version");
  return {
    kind: kind === "desktop" || kind === "mobile" ? kind : null,
    version: version && /^\d+(\.\d+){0,3}$/.test(version) ? version : null,
  };
}

/** Uygulama sürümü minimumun altındaysa true. */
export function upgradeRequired(request: Request): boolean {
  const { kind, version } = appInfoFromRequest(request);
  if (!kind || !version) return false;
  return compareVersions(version, minAppVersions()[kind]) < 0;
}

export function serverVersion() {
  return APP_VERSION;
}

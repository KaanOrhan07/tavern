import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isBarberBusiness } from "@/lib/business-modules";

/** QR menüye erişim yarıçapı (metre). */
export const GEOFENCE_RADIUS_M = 100;
/** Kapalı alan GPS sapması toleransı: bildirilen doğruluk (accuracy) mesafeden düşülür, en fazla bu kadar (m). */
export const GEOFENCE_MAX_ACCURACY_ALLOWANCE_M = 30;
/** Bundan kaba (IP/baz istasyonu tabanlı) konumlar işletmede olmayı KANITLAMAZ → reddedilir (m). */
export const GEOFENCE_MAX_ACCURACY_M = 150;
/** Menüyü görüntüleme yetkisi süresi. */
const VIEW_TTL_SEC = 2 * 60 * 60;
/** Sipariş / garson çağır / hesap iste için konum kanıtının azami yaşı: evden sonradan sipariş verilemesin. */
export const ORDER_PROOF_MAX_AGE_SEC = 15 * 60;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil");
  return new TextEncoder().encode(secret);
}

const cookieName = (slug: string) => `tavern_geo_${slug}`;

export async function grantGeoAccess(slug: string) {
  const token = await new SignJWT({ purpose: "geofence", slug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VIEW_TTL_SEC}s`)
    .sign(secretKey());
  (await cookies()).set(cookieName(slug), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VIEW_TTL_SEC,
  });
}

/** `maxAgeSec` verilirse konum kanıtı en fazla o kadar eski olabilir (sipariş için taze kanıt). */
export async function hasGeoAccess(slug: string, maxAgeSec?: number): Promise<boolean> {
  const token = (await cookies()).get(cookieName(slug))?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "geofence" || payload.slug !== slug) return false;
    if (maxAgeSec !== undefined) {
      const iat = typeof payload.iat === "number" ? payload.iat : 0;
      if (Date.now() / 1000 - iat > maxAgeSec) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export type GeofenceInfo = { required: boolean; latitude: number; longitude: number };

/** Restoran/kafe işletmesinde koordinat tanımlıysa ve geofence açıksa konum doğrulaması gerekir. */
export async function getGeofence(businessId: string): Promise<GeofenceInfo | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { geofenceEnabled: true, type: { select: { key: true } }, businessInfo: true },
  });
  if (!business || !business.geofenceEnabled || isBarberBusiness(business.type.key)) return null;
  const info = business.businessInfo;
  if (info?.latitude == null || info?.longitude == null) return null;
  return { required: true, latitude: info.latitude, longitude: info.longitude };
}

/** Menü görüntüleme kapısı: true → erişim serbest (geofence yok veya doğrulanmış). */
export async function geoAccessOk(businessId: string, slug: string): Promise<boolean> {
  const fence = await getGeofence(businessId);
  if (!fence) return true;
  return hasGeoAccess(slug);
}

export type OrderGeoResult =
  | { ok: true }
  | { ok: false; reason: "verify" | "no_location"; message: string };

/**
 * Sipariş / garson çağır / hesap iste kapısı. Menü görmekten daha katıdır:
 *  - KONUM ŞART: koordinatı tanımlı olmayan (veya geofence'i kapalı) işletmede müşteri QR siparişi verilemez
 *  - Konum kanıtı en fazla 15 dakika eski olabilir (evden, sonradan sipariş verilemesin)
 */
export async function checkOrderGeo(
  businessId: string,
  slug: string,
  opts: { requireFence: boolean }
): Promise<OrderGeoResult> {
  const fence = await getGeofence(businessId);
  if (!fence) {
    if (opts.requireFence) {
      return {
        ok: false,
        reason: "no_location",
        message: "Bu işletmenin konumu tanımlı olmadığı için QR sipariş şu an kapalı. Lütfen garsona söyleyin.",
      };
    }
    return { ok: true };
  }
  if (await hasGeoAccess(slug, ORDER_PROOF_MAX_AGE_SEC)) return { ok: true };
  return {
    ok: false,
    reason: "verify",
    message: "Konumunuzu doğrulamanız gerekiyor. Bu işlem yalnızca işletme içinden yapılabilir.",
  };
}

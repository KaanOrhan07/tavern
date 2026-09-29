import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import {
  GEOFENCE_MAX_ACCURACY_ALLOWANCE_M,
  GEOFENCE_MAX_ACCURACY_M,
  GEOFENCE_RADIUS_M,
  getGeofence,
  grantGeoAccess,
  haversineMeters,
} from "@/lib/geofence";

const schema = z
  .object({
    slug: z.string().min(1).max(120).optional(),
    /** Masa QR anahtarı — slug yerine verilebilir (sipariş sırasında yeniden doğrulama) */
    qrToken: z.string().min(1).max(100).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    /** Zorunlu: doğruluğu bilinmeyen konum kabul edilmez */
    accuracy: z.number().min(0).max(1_000_000),
  })
  .refine((d) => d.slug || d.qrToken, "slug veya qrToken gerekli");

/**
 * Müşterinin konumunu işletmeyle karşılaştırır; içerideyse imzalı erişim çerezi verir.
 * Not: koordinat istemciden geldiği için sahte GPS uygulamasıyla aşılabilir; bu yüzden
 * kaba konumlar reddedilir ve her sipariş için 15 dk'dan taze kanıt istenir.
 */
export async function POST(request: Request) {
  const limited = await rateLimitAsync(`geofence:${clientIp(request)}`, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return NextResponse.json({ error: "Çok fazla deneme" }, { status: 429 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  let slug = body.data.slug;
  if (body.data.qrToken) {
    const table = await prisma.table.findUnique({
      where: { qrToken: body.data.qrToken },
      select: { business: { select: { slug: true } } },
    });
    slug = table?.business.slug;
  }
  if (!slug) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, active: true },
  });
  if (!business || !business.active) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });

  const fence = await getGeofence(business.id);
  if (!fence) {
    await grantGeoAccess(slug);
    return NextResponse.json({ ok: true });
  }

  if (body.data.accuracy > GEOFENCE_MAX_ACCURACY_M) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Konumunuz yeterince hassas değil. Telefonunuzda GPS/“Hassas konum” özelliğini açıp (Wi-Fi ile değil) tekrar deneyin.",
        imprecise: true,
      },
      { status: 422 }
    );
  }

  const distance = haversineMeters(body.data.latitude, body.data.longitude, fence.latitude, fence.longitude);
  const allowance = Math.min(body.data.accuracy, GEOFENCE_MAX_ACCURACY_ALLOWANCE_M);
  if (distance - allowance <= GEOFENCE_RADIUS_M) {
    await grantGeoAccess(slug);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    {
      ok: false,
      error: "Bu menüye yalnızca işletme içinden erişilebilir",
      distanceM: Math.round(distance / 10) * 10,
    },
    { status: 403 }
  );
}

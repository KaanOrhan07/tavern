import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { writeAuditLog } from "@/lib/audit";
import { resolveMapsLink } from "@/lib/maps";
import { qrOrderingEnabled } from "@/lib/order-mode";

/** Yalnızca http/https — `javascript:` gibi şemalar müşteri sayfasında XSS olur. */
const httpUrl = z
  .string()
  .max(300)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Geçerli bir bağlantı girin (https://...)");
const optionalUrl = httpUrl.nullable().optional().or(z.literal(""));

/** Google yorum bağlantısı: yalnızca https ve Google alan adları (g.page, search.google.com, maps.app.goo.gl …). */
const GOOGLE_REVIEW_HOSTS = ["g.page", "g.co", "goo.gl", "maps.app.goo.gl", "share.google", "google.com", "google.com.tr"];
const googleReviewUrl = z
  .string()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      const host = u.hostname.toLowerCase();
      return (
        u.protocol === "https:" &&
        GOOGLE_REVIEW_HOSTS.some((h) => host === h || host.endsWith("." + h))
      );
    } catch {
      return false;
    }
  }, "Geçerli bir Google yorum/işletme bağlantısı girin (g.page, search.google.com/local/writereview… veya maps.app.goo.gl)")
  .nullable()
  .optional()
  .or(z.literal(""));

const schema = z.object({
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  mapsUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  facebookUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  websiteUrl: optionalUrl,
  description: z.string().max(1000).nullable().optional(),
  geofenceEnabled: z.boolean().optional(),
  googleReviewUrl,
  allergenNote: z.string().max(500).nullable().optional(),
});

function emptyToNull(v: string | null | undefined) {
  if (v === "" || v === undefined) return null;
  return v;
}

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const info = await prisma.businessInfo.findUnique({
    where: { businessId: ctx.business.id },
  });
  // Koordinatlar arka planda tutulur; panelde yalnızca "konum tanımlı mı" bilgisi gösterilir
  const { latitude, longitude, ...rest } = info ?? {};
  return NextResponse.json({
    ok: true,
    info: info ? { ...rest, hasCoordinates: latitude != null && longitude != null } : null,
    geofenceEnabled: ctx.business.geofenceEnabled,
    googleReviewUrl: ctx.business.googleReviewUrl,
    allergenNote: ctx.business.allergenNote,
    reviewClicks: ctx.business.reviewClicks,
  });
}

export async function PATCH(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Geçersiz istek" },
      { status: 400 }
    );
  }
  const d = body.data;

  // QR sipariş açıkken konum kısıtı kapatılamaz / Maps linki silinemez (evden sipariş engeli)
  if (qrOrderingEnabled(ctx.business.orderMode)) {
    if (d.geofenceEnabled === false) {
      return NextResponse.json(
        { error: "Müşteri QR siparişi açıkken konum kısıtı kapatılamaz. Önce sipariş modunu 'Sadece Garson' yapın." },
        { status: 400 }
      );
    }
    if (d.mapsUrl !== undefined && !emptyToNull(d.mapsUrl)) {
      return NextResponse.json(
        { error: "Müşteri QR siparişi açıkken Google Maps linki silinemez." },
        { status: 400 }
      );
    }
  }

  // Google Maps linki → koordinat (sunucu tarafında çözülür; enlem/boylam manuel girilmez)
  let mapsFields: { mapsUrl: string | null; latitude: number | null; longitude: number | null } | null = null;
  if (d.mapsUrl !== undefined) {
    const link = emptyToNull(d.mapsUrl);
    if (!link) {
      mapsFields = { mapsUrl: null, latitude: null, longitude: null };
    } else {
      const resolved = await resolveMapsLink(link);
      if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });
      mapsFields = { mapsUrl: link, latitude: resolved.latitude, longitude: resolved.longitude };
    }
  }

  const opt = (v: string | null | undefined) => (v === undefined ? undefined : emptyToNull(v));
  const data = {
    address: d.address === undefined ? undefined : emptyToNull(d.address),
    phone: opt(d.phone),
    instagramUrl: opt(d.instagramUrl),
    tiktokUrl: opt(d.tiktokUrl),
    youtubeUrl: opt(d.youtubeUrl),
    facebookUrl: opt(d.facebookUrl),
    linkedinUrl: opt(d.linkedinUrl),
    websiteUrl: opt(d.websiteUrl),
    description: opt(d.description),
    ...(mapsFields ?? {}),
  };

  const businessData = {
    ...(d.geofenceEnabled !== undefined && { geofenceEnabled: d.geofenceEnabled }),
    ...(d.googleReviewUrl !== undefined && { googleReviewUrl: emptyToNull(d.googleReviewUrl) }),
    ...(d.allergenNote !== undefined && { allergenNote: d.allergenNote?.trim() || null }),
  };

  const [info] = await prisma.$transaction([
    prisma.businessInfo.upsert({
      where: { businessId: ctx.business.id },
      create: { businessId: ctx.business.id, ...data },
      update: data,
    }),
    ...(Object.keys(businessData).length > 0
      ? [prisma.business.update({ where: { id: ctx.business.id }, data: businessData })]
      : []),
  ]);
  if (d.allergenNote !== undefined) revalidateTag(`menu:${ctx.business.id}`, "max");

  await writeAuditLog({
    businessId: ctx.business.id,
    session: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "BusinessInfo",
    entityId: ctx.business.id,
    afterData: { ...data, ...businessData },
  });

  return NextResponse.json({
    ok: true,
    hasCoordinates: info.latitude != null && info.longitude != null,
  });
}

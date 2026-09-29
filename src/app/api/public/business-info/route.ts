import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBarberSettings } from "@/lib/appointments";
import { isBarberBusiness } from "@/lib/business-modules";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug gerekli" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    include: { type: true, businessInfo: true },
  });
  if (!business || !business.active) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  let hours: { openTime: string; closeTime: string } | null = null;
  if (isBarberBusiness(business.type.key)) {
    const s = await getBarberSettings(business.id);
    hours = { openTime: s.openTime, closeTime: s.closeTime };
  }

  const info = business.businessInfo;
  const hasCoords = info?.latitude != null && info?.longitude != null;
  return NextResponse.json({
    ok: true,
    business: {
      name: business.name,
      slug: business.slug,
      hours,
      address: info?.address ?? null,
      // Yol tarifi için işletmenin yapıştırdığı orijinal Google Maps linki öncelikli
      mapsUrl:
        info?.mapsUrl ??
        (hasCoords
          ? `https://www.google.com/maps/dir/?api=1&destination=${info!.latitude},${info!.longitude}`
          : null),
      phone: info?.phone ?? null,
      instagramUrl: info?.instagramUrl ?? null,
      tiktokUrl: info?.tiktokUrl ?? null,
      youtubeUrl: info?.youtubeUrl ?? null,
      facebookUrl: info?.facebookUrl ?? null,
      linkedinUrl: info?.linkedinUrl ?? null,
      websiteUrl: info?.websiteUrl ?? null,
      description: info?.description ?? null,
    },
  });
}

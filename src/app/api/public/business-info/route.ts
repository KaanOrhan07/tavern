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
  return NextResponse.json({
    ok: true,
    business: {
      name: business.name,
      slug: business.slug,
      hours,
      address: info?.address ?? null,
      latitude: info?.latitude ?? null,
      longitude: info?.longitude ?? null,
      phone: info?.phone ?? null,
      instagramUrl: info?.instagramUrl ?? null,
      tiktokUrl: info?.tiktokUrl ?? null,
      websiteUrl: info?.websiteUrl ?? null,
      description: info?.description ?? null,
    },
  });
}

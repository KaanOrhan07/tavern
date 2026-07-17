import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBarberBusiness } from "@/lib/business-modules";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    include: { type: true, barberSettings: true },
  });
  if (!business || !business.active || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: business.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, priceKurus: true },
    }),
    prisma.user.findMany({
      where: { businessId: business.id, role: "STAFF", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    settings: business.barberSettings ?? {
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "20:00",
    },
    services,
    staff,
  });
}

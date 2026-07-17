import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isBarberBusiness } from "@/lib/business-modules";
import { getAvailableSlots } from "@/lib/appointments";

const schema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug: parsed.data.slug },
    include: { type: true },
  });
  if (!business || !business.active || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  const slots = await getAvailableSlots({
    businessId: business.id,
    serviceId: parsed.data.serviceId,
    staffId: parsed.data.staffId,
    date: parsed.data.date,
  });

  return NextResponse.json({ ok: true, slots });
}

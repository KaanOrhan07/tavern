import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isBarberBusiness } from "@/lib/business-modules";
import { getAvailableSlots, getBarberSettings } from "@/lib/appointments";
import { formatDateInTz } from "@/lib/business-timezone";
import { normalizePhone } from "@/lib/loyalty";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { getCustomerSession } from "@/lib/customer-auth";

const schema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startAt: z.string().datetime(),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(10).max(20),
  customerProfileId: z.string().optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`appointment:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const phone = normalizePhone(body.data.customerPhone);
  if (!phone) {
    return NextResponse.json({ error: "Geçersiz telefon numarası" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug: body.data.slug },
    include: { type: true },
  });
  if (!business || !business.active || !isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  const startAt = new Date(body.data.startAt);
  const date = formatDateInTz(startAt);
  const slots = await getAvailableSlots({
    businessId: business.id,
    serviceId: body.data.serviceId,
    staffId: body.data.staffId,
    date,
  });

  const match = slots.find((s) => s.startAt === startAt.toISOString());
  if (!match) {
    return NextResponse.json({ error: "Seçilen saat artık müsait değil" }, { status: 409 });
  }

  const [staff, service, settings] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: body.data.staffId,
        businessId: business.id,
        role: "STAFF",
        active: true,
      },
    }),
    prisma.service.findFirst({
      where: { id: body.data.serviceId, businessId: business.id, active: true },
    }),
    getBarberSettings(business.id),
  ]);
  if (!staff || !service) {
    return NextResponse.json({ error: "Hizmet veya personel bulunamadı" }, { status: 404 });
  }

  let customerProfileId: string | null = null;
  const session = await getCustomerSession();
  if (session?.phone === phone) {
    customerProfileId = session.profileId;
  } else if (body.data.customerProfileId) {
    const profile = await prisma.customerProfile.findFirst({
      where: {
        id: body.data.customerProfileId,
        phone,
        accountStatus: "active",
        phoneVerified: true,
      },
    });
    if (profile) customerProfileId = profile.id;
  }

  const expiresAt = new Date(Date.now() + settings.responseTimeoutMinutes * 60_000);

  const appointment = await prisma.$transaction(async (tx) => {
    const row = await tx.appointment.create({
      data: {
        businessId: business.id,
        staffId: staff.id,
        serviceId: service.id,
        customerName: body.data.customerName.trim(),
        customerPhone: phone,
        customerProfileId,
        startAt,
        endAt: new Date(match.endAt),
        status: "PENDING_BUSINESS_APPROVAL",
        expiresAt,
      },
    });
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: row.id,
        fromStatus: null,
        toStatus: "PENDING_BUSINESS_APPROVAL",
        changedByRole: "customer",
        note: "Randevu talebi oluşturuldu",
      },
    });
    return row;
  });

  await writeAuditLog({
    businessId: business.id,
    action: "CREATE",
    entityType: "Appointment",
    entityId: appointment.id,
    afterData: {
      status: appointment.status,
      staffId: staff.id,
      serviceId: service.id,
      startAt: appointment.startAt,
    },
    ipAddress: ip,
  });

  await prisma.notification.create({
    data: {
      businessId: business.id,
      type: "NEW_APPOINTMENT",
      targetUserId: staff.id,
      message: `Yeni talep — ${staff.name}: ${service.name} — ${appointment.customerName} (${appointment.startAt.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })})`,
    },
  });

  return NextResponse.json({
    ok: true,
    appointment: {
      id: appointment.id,
      cancelToken: appointment.cancelToken,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      expiresAt: appointment.expiresAt,
    },
  });
}

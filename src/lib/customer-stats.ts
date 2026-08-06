import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/loyalty";

type VisitKind = "order" | "appointment";

/**
 * Sipariş/randevu tamamlanınca CustomerBusinessStats + totalVisits günceller.
 * Hesabı olmayan (sadece misafir telefon) için sessizce no-op.
 */
export async function upsertCustomerBusinessStats(params: {
  phone: string | null | undefined;
  businessId: string;
  kind: VisitKind;
  spentKurus?: number;
  customerProfileId?: string | null;
}) {
  const phone = params.phone ? normalizePhone(params.phone) : null;
  if (!phone && !params.customerProfileId) return;

  const profile = params.customerProfileId
    ? await prisma.customerProfile.findFirst({
        where: {
          id: params.customerProfileId,
          phoneVerified: true,
          accountStatus: "active",
        },
        select: { id: true },
      })
    : await prisma.customerProfile.findFirst({
        where: { phone: phone!, phoneVerified: true, accountStatus: "active" },
        select: { id: true },
      });

  if (!profile) return;

  const now = new Date();
  const spent = Math.max(0, params.spentKurus ?? 0);

  await prisma.$transaction([
    prisma.customerProfile.update({
      where: { id: profile.id },
      data: { totalVisits: { increment: 1 } },
    }),
    prisma.customerBusinessStats.upsert({
      where: {
        customerProfileId_businessId: {
          customerProfileId: profile.id,
          businessId: params.businessId,
        },
      },
      create: {
        customerProfileId: profile.id,
        businessId: params.businessId,
        firstVisitAt: now,
        lastVisitAt: now,
        totalVisits: 1,
        totalOrders: params.kind === "order" ? 1 : 0,
        totalAppointments: params.kind === "appointment" ? 1 : 0,
        totalSpentKurus: spent,
      },
      update: {
        lastVisitAt: now,
        totalVisits: { increment: 1 },
        ...(params.kind === "order"
          ? { totalOrders: { increment: 1 }, totalSpentKurus: { increment: spent } }
          : { totalAppointments: { increment: 1 }, totalSpentKurus: { increment: spent } }),
      },
    }),
  ]);
}

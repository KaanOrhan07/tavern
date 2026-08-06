import { prisma } from "@/lib/prisma";
import { isBarberBusiness } from "@/lib/business-modules";
import { toDisplayImageUrl } from "@/lib/storage-url";
import { formatKurus } from "@/lib/utils";

export type FrequentPlace = {
  businessId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  visitCount: number;
  lastVisitAt: string | null;
  loyaltyPoints: number;
  tierName: string | null;
  isBarber: boolean;
};

export type CustomerAppointmentRow = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  businessName: string;
  businessSlug: string;
  serviceName: string;
  staffName: string;
  cancelToken: string;
};

export type TopTierBadge = {
  tierName: string;
  businessName: string;
  businessSlug: string;
} | null;

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)} *** ** ${phone.slice(-2)}`;
}

/** Stats tablosu + loyalty ile Instagram profil verisi. */
export async function getCustomerHomePayload(profileId: string, phone: string) {
  const [profile, stats, loyaltyAccounts] = await Promise.all([
    prisma.customerProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        phone: true,
        fullName: true,
        totalVisits: true,
        preferredLocale: true,
      },
    }),
    prisma.customerBusinessStats.findMany({
      where: { customerProfileId: profileId },
      orderBy: { totalVisits: "desc" },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            active: true,
            type: { select: { key: true } },
          },
        },
      },
    }),
    prisma.loyaltyAccount.findMany({
      where: { phone },
      select: {
        businessId: true,
        points: true,
        lifetimeEarnedPoints: true,
        tier: { select: { tierName: true, minLifetimePoints: true, rankOrder: true } },
        business: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            active: true,
            type: { select: { key: true } },
          },
        },
      },
    }),
  ]);

  if (!profile) return null;

  const loyaltyMap = new Map(
    loyaltyAccounts.map((a) => [
      a.businessId,
      {
        points: a.points,
        lifetime: a.lifetimeEarnedPoints,
        tierName: a.tier?.tierName ?? null,
        rankOrder: a.tier?.rankOrder ?? -1,
        businessName: a.business.name,
        businessSlug: a.business.slug,
      },
    ])
  );

  const places: FrequentPlace[] = stats
    .filter((s) => s.business.active)
    .map((s) => {
      const loyalty = loyaltyMap.get(s.businessId);
      return {
        businessId: s.businessId,
        name: s.business.name,
        slug: s.business.slug,
        logoUrl: s.business.logoUrl ? toDisplayImageUrl(s.business.logoUrl) : null,
        visitCount: s.totalVisits,
        lastVisitAt: s.lastVisitAt.toISOString(),
        loyaltyPoints: loyalty?.points ?? 0,
        tierName: loyalty?.tierName ?? null,
        isBarber: isBarberBusiness(s.business.type.key),
      };
    });

  // Stats'ta yok ama loyalty hesabı olan işletmeler
  for (const a of loyaltyAccounts) {
    if (places.some((p) => p.businessId === a.businessId)) continue;
    if (!a.business?.active) continue;
    places.push({
      businessId: a.businessId,
      name: a.business.name,
      slug: a.business.slug,
      logoUrl: a.business.logoUrl ? toDisplayImageUrl(a.business.logoUrl) : null,
      visitCount: 0,
      lastVisitAt: null,
      loyaltyPoints: a.points,
      tierName: a.tier?.tierName ?? null,
      isBarber: isBarberBusiness(a.business.type.key),
    });
  }

  places.sort((a, b) => b.visitCount - a.visitCount || a.name.localeCompare(b.name, "tr"));

  const totalPoints = loyaltyAccounts.reduce((s, a) => s + a.points, 0);
  let topTier: TopTierBadge = null;
  let bestRank = -1;
  for (const a of loyaltyAccounts) {
    if (!a.tier) continue;
    const rank = a.tier.rankOrder ?? a.tier.minLifetimePoints ?? 0;
    if (rank >= bestRank) {
      bestRank = rank;
      topTier = {
        tierName: a.tier.tierName,
        businessName: a.business.name,
        businessSlug: a.business.slug,
      };
    }
  }

  return {
    profile: {
      id: profile.id,
      phone: profile.phone,
      phoneMasked: maskPhone(profile.phone),
      fullName: profile.fullName,
      totalVisits: profile.totalVisits,
      preferredLocale: profile.preferredLocale,
    },
    stats: {
      businessCount: places.length,
      totalPoints,
      totalVisits: profile.totalVisits,
    },
    topTier,
    highlights: places.slice(0, 5),
    places,
  };
}

export async function getCustomerAppointments(
  phone: string,
  profileId: string,
  limit = 20
): Promise<CustomerAppointmentRow[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      OR: [{ customerPhone: phone }, { customerProfileId: profileId }],
    },
    orderBy: { startAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      cancelToken: true,
      business: { select: { name: true, slug: true } },
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    cancelToken: r.cancelToken,
    businessName: r.business.name,
    businessSlug: r.business.slug,
    serviceName: r.service.name,
    staffName: r.staff.name,
  }));
}

export type BusinessHistoryItem = {
  id: string;
  kind: "order" | "appointment";
  at: string;
  title: string;
  amountLabel: string | null;
  status: string;
};

export async function getBusinessHistoryForCustomer(params: {
  phone: string;
  profileId: string;
  businessSlug: string;
}) {
  const business = await prisma.business.findFirst({
    where: { slug: params.businessSlug, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      type: { select: { key: true } },
    },
  });
  if (!business) return null;

  const [stats, loyalty, orders, appointments] = await Promise.all([
    prisma.customerBusinessStats.findUnique({
      where: {
        customerProfileId_businessId: {
          customerProfileId: params.profileId,
          businessId: business.id,
        },
      },
    }),
    prisma.loyaltyAccount.findUnique({
      where: { businessId_phone: { businessId: business.id, phone: params.phone } },
      include: { tier: { select: { tierName: true } } },
    }),
    prisma.order.findMany({
      where: {
        businessId: business.id,
        customerPhone: params.phone,
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        items: { select: { productName: true, quantity: true, unitKurus: true } },
        payments: { select: { amountKurus: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        OR: [
          { customerPhone: params.phone },
          { customerProfileId: params.profileId },
        ],
      },
      orderBy: { startAt: "desc" },
      take: 40,
      include: {
        service: { select: { name: true, priceKurus: true } },
        staff: { select: { name: true } },
      },
    }),
  ]);

  const history: BusinessHistoryItem[] = [];

  for (const o of orders) {
    const paid = o.payments.reduce((s, p) => s + p.amountKurus, 0);
    const names = o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ");
    history.push({
      id: o.id,
      kind: "order",
      at: o.createdAt.toISOString(),
      title: names || "Sipariş",
      amountLabel: paid > 0 ? formatKurus(paid) : null,
      status: o.status,
    });
  }

  for (const a of appointments) {
    history.push({
      id: a.id,
      kind: "appointment",
      at: a.startAt.toISOString(),
      title: `${a.service.name} · ${a.staff.name}`,
      amountLabel: formatKurus(a.service.priceKurus),
      status: a.status,
    });
  }

  history.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      logoUrl: business.logoUrl ? toDisplayImageUrl(business.logoUrl) : null,
      isBarber: isBarberBusiness(business.type.key),
    },
    stats: stats
      ? {
          totalVisits: stats.totalVisits,
          totalOrders: stats.totalOrders,
          totalAppointments: stats.totalAppointments,
          totalSpentKurus: stats.totalSpentKurus,
          lastVisitAt: stats.lastVisitAt.toISOString(),
        }
      : null,
    loyalty: loyalty
      ? { points: loyalty.points, tierName: loyalty.tier?.tierName ?? null }
      : { points: 0, tierName: null },
    history,
  };
}

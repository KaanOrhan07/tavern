import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAuditLog } from "@/lib/audit";
import { formatKurus } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const profile = await prisma.customerProfile.findUnique({
    where: { id },
    include: {
      businessStats: {
        include: {
          business: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { lastVisitAt: "desc" },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  await writeAuditLog({
    action: "UPDATE",
    entityType: "CustomerProfile",
    entityId: profile.id,
    metadata: {
      admin: true,
      action: "customer_detail_viewed",
      adminUserId: ctx.session.adminUserId ?? null,
    },
  });

  const loyalty = await prisma.loyaltyAccount.findMany({
    where: { phone: profile.phone },
    include: {
      tier: { select: { tierName: true } },
      business: { select: { id: true, name: true, slug: true } },
    },
  });
  const loyaltyByBiz = new Map(loyalty.map((l) => [l.businessId, l]));

  const [orders, appointments] = await Promise.all([
    prisma.order.findMany({
      where: { customerPhone: profile.phone, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        business: { select: { name: true, slug: true } },
        payments: { select: { amountKurus: true } },
        items: { select: { productName: true, quantity: true }, take: 3 },
      },
    }),
    prisma.appointment.findMany({
      where: {
        OR: [{ customerPhone: profile.phone }, { customerProfileId: profile.id }],
      },
      orderBy: { startAt: "desc" },
      take: 50,
      include: {
        business: { select: { name: true, slug: true } },
        service: { select: { name: true, priceKurus: true } },
      },
    }),
  ]);

  const businessRows = profile.businessStats.map((s) => {
    const loy = loyaltyByBiz.get(s.businessId);
    return {
      businessId: s.businessId,
      businessName: s.business.name,
      businessSlug: s.business.slug,
      totalVisits: s.totalVisits,
      totalOrders: s.totalOrders,
      totalAppointments: s.totalAppointments,
      totalSpentKurus: s.totalSpentKurus,
      lastVisitAt: s.lastVisitAt,
      points: loy?.points ?? 0,
      tierName: loy?.tier?.tierName ?? null,
    };
  });

  // Loyalty-only businesses without stats yet
  for (const l of loyalty) {
    if (businessRows.some((b) => b.businessId === l.businessId)) continue;
    businessRows.push({
      businessId: l.businessId,
      businessName: l.business.name,
      businessSlug: l.business.slug,
      totalVisits: 0,
      totalOrders: 0,
      totalAppointments: 0,
      totalSpentKurus: 0,
      lastVisitAt: l.createdAt,
      points: l.points,
      tierName: l.tier?.tierName ?? null,
    });
  }

  const history = [
    ...orders.map((o) => ({
      id: o.id,
      kind: "order" as const,
      at: o.createdAt.toISOString(),
      businessName: o.business.name,
      title: o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ") || "Sipariş",
      amountLabel: formatKurus(o.payments.reduce((s, p) => s + p.amountKurus, 0)),
      status: o.status,
    })),
    ...appointments.map((a) => ({
      id: a.id,
      kind: "appointment" as const,
      at: a.startAt.toISOString(),
      businessName: a.business.name,
      title: a.service.name,
      amountLabel: formatKurus(a.service.priceKurus),
      status: a.status,
    })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const totalPoints = loyalty.reduce((s, l) => s + l.points, 0);

  return NextResponse.json({
    ok: true,
    customer: {
      id: profile.id,
      phone: profile.phone,
      fullName: profile.fullName,
      birthDate: profile.birthDate,
      accountStatus: profile.accountStatus,
      phoneVerified: profile.phoneVerified,
      totalVisits: profile.totalVisits,
      createdAt: profile.createdAt,
      lastLoginAt: profile.lastLoginAt,
      businessCount: businessRows.length,
      totalPoints,
    },
    businesses: businessRows,
    history,
  });
}

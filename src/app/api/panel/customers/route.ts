import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}

/** İşletmenin kendi müşterileri — CustomerBusinessStats + sadakat (tenant izole). */
export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const businessId = ctx.business.id;

  const [statsRows, legacy] = await Promise.all([
    prisma.customerBusinessStats.findMany({
      where: { businessId },
      orderBy: { lastVisitAt: "desc" },
      take: 200,
      include: {
        customerProfile: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            accountStatus: true,
          },
        },
      },
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: [{ lastOrderAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  const phones = [
    ...new Set([
      ...statsRows.map((s) => s.customerProfile.phone),
      ...legacy.map((c) => c.phone),
    ]),
  ];

  const loyalty = phones.length
    ? await prisma.loyaltyAccount.findMany({
        where: { businessId, phone: { in: phones } },
        include: { tier: { select: { tierName: true } } },
      })
    : [];
  const loyaltyMap = new Map(loyalty.map((l) => [l.phone, l]));

  const byPhone = new Map<
    string,
    {
      id: string;
      phoneMasked: string;
      name: string | null;
      totalVisits: number;
      totalOrders: number;
      totalAppointments: number;
      totalSpendKurus: number;
      lastVisitAt: string | null;
      tierName: string | null;
      loyaltyPoints: number;
      source: "profile" | "legacy";
    }
  >();

  for (const s of statsRows) {
    if (s.customerProfile.accountStatus !== "active") continue;
    const loy = loyaltyMap.get(s.customerProfile.phone);
    byPhone.set(s.customerProfile.phone, {
      id: s.customerProfile.id,
      phoneMasked: maskPhone(s.customerProfile.phone),
      name: s.customerProfile.fullName,
      totalVisits: s.totalVisits,
      totalOrders: s.totalOrders,
      totalAppointments: s.totalAppointments,
      totalSpendKurus: s.totalSpentKurus,
      lastVisitAt: s.lastVisitAt.toISOString(),
      tierName: loy?.tier?.tierName ?? null,
      loyaltyPoints: loy?.points ?? 0,
      source: "profile",
    });
  }

  for (const c of legacy) {
    if (byPhone.has(c.phone)) continue;
    const loy = loyaltyMap.get(c.phone);
    byPhone.set(c.phone, {
      id: c.id,
      phoneMasked: maskPhone(c.phone),
      name: c.name,
      totalVisits: c.orderCount,
      totalOrders: c.orderCount,
      totalAppointments: 0,
      totalSpendKurus: c.totalSpendKurus,
      lastVisitAt: c.lastOrderAt?.toISOString() ?? null,
      tierName: loy?.tier?.tierName ?? null,
      loyaltyPoints: loy?.points ?? 0,
      source: "legacy",
    });
  }

  const customers = [...byPhone.values()].sort((a, b) => {
    const ta = a.lastVisitAt ? +new Date(a.lastVisitAt) : 0;
    const tb = b.lastVisitAt ? +new Date(b.lastVisitAt) : 0;
    return tb - ta;
  });

  return NextResponse.json({ ok: true, customers });
}

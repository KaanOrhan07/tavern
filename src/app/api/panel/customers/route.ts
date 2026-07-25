import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const customers = await prisma.customer.findMany({
    where: { businessId: ctx.business.id },
    orderBy: [{ lastOrderAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      phoneMasked: maskPhone(c.phone),
      name: c.name,
      orderCount: c.orderCount,
      totalSpendKurus: c.totalSpendKurus,
      lastOrderAt: c.lastOrderAt,
      preferredLocale: c.preferredLocale,
    })),
  });
}

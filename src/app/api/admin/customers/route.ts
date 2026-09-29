import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { hashPin } from "@/lib/pin";
import { writeAdminAudit } from "@/lib/audit";
import { randomInt } from "crypto";

export async function GET(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const customers = await prisma.customerProfile.findMany({
    where: q
      ? {
          OR: [
            { phone: { contains: q.replace(/\D/g, "") } },
            { fullName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      businessStats: {
        select: { businessId: true, business: { select: { name: true } } },
      },
    },
  });

  const phones = customers.map((c) => c.phone);
  const loyalty =
    phones.length > 0
      ? await prisma.loyaltyAccount.groupBy({
          by: ["phone"],
          where: { phone: { in: phones } },
          _sum: { points: true },
        })
      : [];
  const pointsMap = new Map(loyalty.map((l) => [l.phone, l._sum.points ?? 0]));

  return NextResponse.json({
    ok: true,
    customers: customers.map((c) => {
      const businessNames = [...new Set(c.businessStats.map((s) => s.business.name))];
      return {
        id: c.id,
        phone: c.phone,
        fullName: c.fullName,
        accountStatus: c.accountStatus,
        phoneVerified: c.phoneVerified,
        totalVisits: c.totalVisits,
        createdAt: c.createdAt,
        lastLoginAt: c.lastLoginAt,
        businesses: businessNames,
        businessCount: businessNames.length,
        totalPoints: pointsMap.get(c.phone) ?? 0,
      };
    }),
  });
}

const resetSchema = z.object({
  id: z.string().min(1),
});

/** Geçici PIN üretir; düz metin yalnızca bir kez yanıtta döner. */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const body = resetSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const tempPin = String(randomInt(100000, 999999));
  const pinHash = await hashPin(tempPin);
  const profile = await prisma.customerProfile.update({
    where: { id: body.data.id },
    data: {
      pinHash,
      forcePinChange: true,
      failedPinAttempts: 0,
      lockedUntil: null,
    },
  });

  await writeAdminAudit({
    admin: ctx.session,
    action: "UPDATE",
    entityType: "CustomerProfile",
    entityId: profile.id,
    summary: `Müşteri PIN'i sıfırlandı: ${profile.phone}`,
    metadata: { action: "pin_reset" },
    request,
  });

  return NextResponse.json({
    ok: true,
    temporaryPin: tempPin,
    message: "Bu PIN yalnızca bir kez gösterilir. Müşteriye iletin.",
  });
}

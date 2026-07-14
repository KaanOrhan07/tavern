import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { getLoyaltyBalance, normalizePhone } from "@/lib/loyalty";

const querySchema = z.object({
  slug: z.string().min(1),
  phone: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    slug: url.searchParams.get("slug"),
    phone: url.searchParams.get("phone"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true, active: true },
  });
  if (!business || !business.active) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }
  if (!(await isFeatureEnabled(business.id, "loyalty_points"))) {
    return NextResponse.json({ error: "Sadakat sistemi kapalı" }, { status: 403 });
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "Geçersiz telefon" }, { status: 400 });
  }

  const balance = await getLoyaltyBalance(business.id, phone);
  if (!balance) {
    return NextResponse.json({ error: "Geçersiz telefon" }, { status: 400 });
  }

  return NextResponse.json({
    points: balance.points,
    canRedeem: balance.canRedeem,
    redeemThresholdPoints: balance.config.redeemThresholdPoints,
    redeemDiscountPercent: balance.config.redeemDiscountPercent,
  });
}

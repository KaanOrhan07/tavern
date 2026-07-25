import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterActiveCampaigns } from "@/lib/campaigns";
import { toDisplayImageUrl } from "@/lib/storage-url";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, active: true },
  });
  if (!business || !business.active) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      businessId: business.id,
      active: true,
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() },
    },
    include: { translations: true },
  });

  const active = filterActiveCampaigns(campaigns).map((c) => ({
    id: c.id,
    displayType: c.displayType,
    targetType: c.targetType,
    targetProductId: c.targetProductId,
    targetCategoryId: c.targetCategoryId,
    imageUrl: c.imageUrl ? toDisplayImageUrl(c.imageUrl) : null,
    displayFrequency: c.displayFrequency,
    sortOrder: c.sortOrder,
    translations: c.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      description: t.description,
      buttonText: t.buttonText,
    })),
  }));

  return NextResponse.json({ campaigns: active });
}

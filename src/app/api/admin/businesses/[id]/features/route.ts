import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";

const schema = z.object({
  featureKey: z.enum(FEATURES.map((f) => f.key) as [string, ...string[]]),
  enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const { featureKey, enabled } = body.data;
  await prisma.businessFeature.upsert({
    where: { businessId_featureKey: { businessId: id, featureKey } },
    update: { enabled },
    create: { businessId: id, featureKey, enabled },
  });
  return NextResponse.json({ ok: true });
}

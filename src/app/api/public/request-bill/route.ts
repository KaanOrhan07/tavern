import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { checkOrderGeo } from "@/lib/geofence";

const schema = z.object({ qrToken: z.string().min(1) });

/** Müşteri "Hesap İste" — masaya bildirim düşürür (garson çağır ile aynı altyapı). */
export async function POST(request: Request) {
  const limited = await rateLimitAsync(`request-bill:${clientIp(request)}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const table = await prisma.table.findUnique({
    where: { qrToken: body.data.qrToken },
    include: { business: true },
  });
  if (!table || !table.business.active) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }
  const geo = await checkOrderGeo(table.businessId, table.business.slug, { requireFence: false });
  if (!geo.ok) {
    return NextResponse.json(
      { error: geo.message, geoRequired: true, reason: geo.reason },
      { status: 403 }
    );
  }

  const message = `${table.name}: hesap istiyor`;
  const recentDuplicate = await prisma.notification.findFirst({
    where: {
      businessId: table.businessId,
      type: "REQUEST_BILL",
      message,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (!recentDuplicate) {
    await prisma.notification.create({
      data: {
        businessId: table.businessId,
        type: "REQUEST_BILL",
        message,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

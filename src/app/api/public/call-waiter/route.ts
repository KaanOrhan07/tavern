import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { checkOrderGeo } from "@/lib/geofence";

const schema = z.object({ qrToken: z.string().min(1) });

// Müşteri "Garson Çağır" butonu — masaya bildirim düşürür.
export async function POST(request: Request) {
  const limited = await rateLimitAsync(`call-waiter:${clientIp(request)}`, {
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

  // Aynı masadan art arda basılan çağrılar için kısa süreli tekilleştirme (spam önleme).
  const recentDuplicate = await prisma.notification.findFirst({
    where: {
      businessId: table.businessId,
      type: "CALL_WAITER",
      message: `${table.name}: garson çağırıyor`,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (!recentDuplicate) {
    await prisma.notification.create({
      data: {
        businessId: table.businessId,
        type: "CALL_WAITER",
        message: `${table.name}: garson çağırıyor`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

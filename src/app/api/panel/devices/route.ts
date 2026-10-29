import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { createDevice } from "@/lib/devices";
import { writeAuditLog } from "@/lib/audit";
import { rateLimitAsync } from "@/lib/rate-limit";

/** İşletme sahibi: cihaz anahtarlarını (yazdırma ajanı, masaüstü, mobil) listeler. Anahtarın kendisi ASLA döndürülmez. */
export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const devices = await prisma.deviceToken.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, kind: true, lastSeenAt: true, revokedAt: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, devices });
}

const createSchema = z.object({
  kind: z.enum(["PRINT_AGENT", "DESKTOP", "MOBILE"]),
  name: z.string().trim().min(2).max(60),
});

/** Yeni cihaz anahtarı üretir; anahtar YALNIZCA bu yanıtta bir kez gösterilir. */
export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const limited = await rateLimitAsync(`device-create:${ctx.business.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!limited.ok) return NextResponse.json({ error: "Çok fazla cihaz oluşturuldu, biraz bekleyin" }, { status: 429 });

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Cihaz türü ve adı (en az 2 karakter) gerekli" }, { status: 400 });

  const { token, device } = await createDevice({
    businessId: ctx.business.id,
    kind: body.data.kind,
    name: body.data.name,
    createdById: ctx.session.userId,
  });
  await writeAuditLog({
    businessId: ctx.business.id,
    session: ctx.session,
    action: "CREATE",
    entityType: "DeviceToken",
    entityId: device.id,
    metadata: { kind: device.kind, name: device.name },
  });
  return NextResponse.json({ ok: true, device, token });
}

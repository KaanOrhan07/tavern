import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { hashPin, pinFingerprint, validatePinFormat } from "@/lib/pin";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const createSchema = z.object({
  name: z.string().min(2).max(60),
  pin: z.string().regex(/^\d{4,8}$/, "PIN 4-8 haneli rakam olmalı"),
});

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const staff = await prisma.user.findMany({
    where: { businessId: ctx.business.id, role: "STAFF" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, active: true, pinHash: true, pin: true },
  });
  return NextResponse.json({
    staff: staff.map((s) => ({
      id: s.id,
      name: s.name,
      active: s.active,
      hasPin: Boolean(s.pinHash || s.pin),
    })),
  });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek (PIN 4-8 hane olmalı)" }, { status: 400 });
  }

  const pinError = validatePinFormat(body.data.pin);
  if (pinError) {
    return NextResponse.json({ error: pinError }, { status: 400 });
  }

  const fingerprint = pinFingerprint(ctx.business.id, body.data.pin);
  const existing = await prisma.user.findFirst({
    where: {
      businessId: ctx.business.id,
      OR: [{ pinFingerprint: fingerprint }, { pin: body.data.pin }],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu PIN başka bir personelde kayıtlı" },
      { status: 409 }
    );
  }

  try {
    const staff = await prisma.user.create({
      data: {
        businessId: ctx.business.id,
        role: "STAFF",
        name: body.data.name.trim(),
        pinHash: await hashPin(body.data.pin),
        pinFingerprint: fingerprint,
        pin: null,
      },
      select: { id: true, name: true, active: true },
    });
    await writeAuditLog({
      session: ctx.session,
      action: "CREATE",
      entityType: "User",
      entityId: staff.id,
      afterData: { name: staff.name, role: "STAFF" },
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({
      ok: true,
      staff: { ...staff, hasPin: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Bu PIN başka bir personelde kayıtlı" },
      { status: 409 }
    );
  }
}

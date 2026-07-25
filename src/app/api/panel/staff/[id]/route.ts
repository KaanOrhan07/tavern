import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { hashPin, pinFingerprint, validatePinFormat } from "@/lib/pin";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const patchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  pin: z.string().regex(/^\d{4,8}$/).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id, businessId: ctx.business.id, role: "STAFF" },
  });
  if (!existing) {
    return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 });
  }

  const data: {
    name?: string;
    pin?: string | null;
    pinHash?: string;
    pinFingerprint?: string;
    active?: boolean;
    sessionVersion?: { increment: number };
  } = {};

  if (body.data.name !== undefined) data.name = body.data.name;
  if (body.data.active !== undefined) {
    data.active = body.data.active;
    if (body.data.active === false) {
      data.sessionVersion = { increment: 1 };
    }
  }

  if (body.data.pin !== undefined) {
    const pinError = validatePinFormat(body.data.pin);
    if (pinError) {
      return NextResponse.json({ error: pinError }, { status: 400 });
    }
    const fingerprint = pinFingerprint(ctx.business.id, body.data.pin);
    const clash = await prisma.user.findFirst({
      where: {
        businessId: ctx.business.id,
        id: { not: id },
        OR: [{ pinFingerprint: fingerprint }, { pin: body.data.pin }],
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Bu PIN başka bir personelde kayıtlı" },
        { status: 409 }
      );
    }
    data.pinHash = await hashPin(body.data.pin);
    data.pinFingerprint = fingerprint;
    data.pin = null;
    data.sessionVersion = { increment: 1 };
  }

  try {
    await prisma.user.update({
      where: { id },
      data,
    });
    await writeAuditLog({
      session: ctx.session,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      beforeData: { name: existing.name, active: existing.active },
      afterData: {
        name: body.data.name ?? existing.name,
        active: body.data.active ?? existing.active,
        pinChanged: Boolean(body.data.pin),
      },
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Bu PIN başka bir personelde kayıtlı" },
      { status: 409 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const result = await prisma.user.deleteMany({
    where: { id, businessId: ctx.business.id, role: "STAFF" },
  });
  if (result.count > 0) {
    await writeAuditLog({
      session: ctx.session,
      action: "DELETE",
      entityType: "User",
      entityId: id,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
  }
  return NextResponse.json({ ok: true });
}

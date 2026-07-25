import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPanelSession } from "@/lib/auth";
import { clientIp, rateLimitAsync } from "@/lib/rate-limit";
import { defaultStaffPath } from "@/lib/business-modules";
import { hashPin, pinFingerprint, validatePinFormat, verifyPinHash } from "@/lib/pin";
import { verifyPassword } from "@/lib/password";
import { writeAuditLog } from "@/lib/audit";

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("owner"),
    slug: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1),
  }),
  z.object({
    mode: z.literal("staff"),
    slug: z.string().min(1),
    pin: z.string().regex(/^\d{4,8}$/),
  }),
]);

export async function POST(request: Request) {
  const ip = clientIp(request);
  const ua = request.headers.get("user-agent");

  const ipLimited = await rateLimitAsync(`panel-login:ip:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimited.ok) {
    return NextResponse.json(
      { error: "Çok fazla deneme, lütfen bekleyin" },
      { status: 429, headers: { "Retry-After": String(ipLimited.retryAfterSec) } }
    );
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const data = body.data;

  const business = await prisma.business.findUnique({
    where: { slug: data.slug },
    include: { type: true },
  });
  if (!business) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }
  if (!business.active) {
    return NextResponse.json(
      { error: "Bu işletme şu anda pasif durumda" },
      { status: 403 }
    );
  }

  if (data.mode === "owner") {
    const accountLimited = await rateLimitAsync(
      `panel-login:owner:${business.id}:${data.email.toLowerCase()}`,
      { limit: 8, windowMs: 15 * 60 * 1000 }
    );
    if (!accountLimited.ok) {
      return NextResponse.json(
        { error: "Çok fazla deneme, lütfen bekleyin" },
        { status: 429, headers: { "Retry-After": String(accountLimited.retryAfterSec) } }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        businessId: business.id,
        role: "OWNER",
        email: data.email,
        active: true,
      },
    });
    if (!user?.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı" },
        { status: 401 }
      );
    }
    await createPanelSession({
      role: "owner",
      userId: user.id,
      businessId: business.id,
      businessSlug: business.slug,
      name: user.name,
      sessionVersion: user.sessionVersion,
    });
    await writeAuditLog({
      businessId: business.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
      userAgent: ua,
      metadata: { mode: "owner" },
      session: {
        role: "owner",
        userId: user.id,
        businessId: business.id,
        businessSlug: business.slug,
        name: user.name,
        sessionVersion: user.sessionVersion,
      },
    });
    return NextResponse.json({
      ok: true,
      role: "owner",
      redirectPath: `/panel/${business.slug}/dashboard`,
    });
  }

  const pinError = validatePinFormat(data.pin);
  if (pinError) {
    return NextResponse.json({ error: "PIN hatalı" }, { status: 401 });
  }

  const staffLimited = await rateLimitAsync(`panel-login:staff:${business.id}:${ip}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!staffLimited.ok) {
    return NextResponse.json(
      { error: "Çok fazla deneme, lütfen bekleyin" },
      { status: 429, headers: { "Retry-After": String(staffLimited.retryAfterSec) } }
    );
  }

  const fingerprint = pinFingerprint(business.id, data.pin);
  let staff = await prisma.user.findFirst({
    where: {
      businessId: business.id,
      role: "STAFF",
      active: true,
      OR: [{ pinFingerprint: fingerprint }, { pin: data.pin }],
    },
  });

  if (!staff) {
    return NextResponse.json({ error: "PIN hatalı" }, { status: 401 });
  }

  if (staff.pinHash) {
    const ok = await verifyPinHash(data.pin, staff.pinHash);
    if (!ok) return NextResponse.json({ error: "PIN hatalı" }, { status: 401 });
  } else if (staff.pin === data.pin) {
    // Eski düz metin PIN → hash'e yükselt
    const hashed = await hashPin(data.pin);
    staff = await prisma.user.update({
      where: { id: staff.id },
      data: {
        pinHash: hashed,
        pinFingerprint: fingerprint,
        pin: null,
      },
    });
  } else {
    return NextResponse.json({ error: "PIN hatalı" }, { status: 401 });
  }

  await createPanelSession({
    role: "staff",
    userId: staff.id,
    businessId: business.id,
    businessSlug: business.slug,
    name: staff.name,
    sessionVersion: staff.sessionVersion,
  });
  await writeAuditLog({
    businessId: business.id,
    action: "LOGIN",
    entityType: "User",
    entityId: staff.id,
    ipAddress: ip,
    userAgent: ua,
    metadata: { mode: "staff" },
    session: {
      role: "staff",
      userId: staff.id,
      businessId: business.id,
      businessSlug: business.slug,
      name: staff.name,
      sessionVersion: staff.sessionVersion,
    },
  });
  return NextResponse.json({
    ok: true,
    role: "staff",
    redirectPath: defaultStaffPath(business.slug, business.type.key),
  });
}

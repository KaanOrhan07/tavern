import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPanelSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { defaultStaffPath } from "@/lib/business-modules";

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
    pin: z.string().regex(/^\d{4,6}$/),
  }),
]);

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`panel-login:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla deneme, lütfen bekleyin" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
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
    const user = await prisma.user.findFirst({
      where: {
        businessId: business.id,
        role: "OWNER",
        email: data.email,
        active: true,
      },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(data.password, user.passwordHash))) {
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
    });
    return NextResponse.json({
      ok: true,
      role: "owner",
      redirectPath: `/panel/${business.slug}/dashboard`,
    });
  }

  const staff = await prisma.user.findFirst({
    where: {
      businessId: business.id,
      role: "STAFF",
      pin: data.pin,
      active: true,
    },
  });
  if (!staff) {
    return NextResponse.json({ error: "PIN hatalı" }, { status: 401 });
  }
  await createPanelSession({
    role: "staff",
    userId: staff.id,
    businessId: business.id,
    businessSlug: business.slug,
    name: staff.name,
  });
  return NextResponse.json({
    ok: true,
    role: "staff",
    redirectPath: defaultStaffPath(business.slug, business.type.key),
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPanelSession } from "@/lib/auth";

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
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const data = body.data;

  const business = await prisma.business.findUnique({
    where: { slug: data.slug },
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
    return NextResponse.json({ ok: true, role: "owner" });
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
  return NextResponse.json({ ok: true, role: "staff" });
}

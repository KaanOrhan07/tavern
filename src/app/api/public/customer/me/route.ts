import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ ok: false, profile: null }, { status: 200 });
  }

  const profile = await prisma.customerProfile.findFirst({
    where: {
      id: session.profileId,
      phone: session.phone,
      phoneVerified: true,
      accountStatus: "active",
    },
    select: {
      id: true,
      phone: true,
      fullName: true,
      preferredLocale: true,
      totalVisits: true,
      lastLoginAt: true,
      forcePinChange: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ ok: false, profile: null }, { status: 200 });
  }

  return NextResponse.json({ ok: true, profile });
}

const patchSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  preferredLocale: z.enum(["tr", "en", "de", "es", "ru", "ar"]).optional(),
});

export async function PATCH(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const profile = await prisma.customerProfile.update({
    where: { id: session.profileId },
    data: {
      ...(body.data.fullName !== undefined ? { fullName: body.data.fullName.trim() } : {}),
      ...(body.data.preferredLocale !== undefined
        ? { preferredLocale: body.data.preferredLocale }
        : {}),
    },
    select: {
      id: true,
      phone: true,
      fullName: true,
      preferredLocale: true,
      totalVisits: true,
    },
  });

  return NextResponse.json({ ok: true, profile });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  address: z.string().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  instagramUrl: z.string().url().max(300).nullable().optional().or(z.literal("")),
  tiktokUrl: z.string().url().max(300).nullable().optional().or(z.literal("")),
  websiteUrl: z.string().url().max(300).nullable().optional().or(z.literal("")),
  description: z.string().max(1000).nullable().optional(),
});

function emptyToNull(v: string | null | undefined) {
  if (v === "" || v === undefined) return null;
  return v;
}

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const info = await prisma.businessInfo.findUnique({
    where: { businessId: ctx.business.id },
  });
  return NextResponse.json({ ok: true, info });
}

export async function PATCH(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const data = {
    address: body.data.address ?? undefined,
    latitude: body.data.latitude ?? undefined,
    longitude: body.data.longitude ?? undefined,
    phone: body.data.phone === undefined ? undefined : emptyToNull(body.data.phone),
    instagramUrl:
      body.data.instagramUrl === undefined ? undefined : emptyToNull(body.data.instagramUrl),
    tiktokUrl: body.data.tiktokUrl === undefined ? undefined : emptyToNull(body.data.tiktokUrl),
    websiteUrl: body.data.websiteUrl === undefined ? undefined : emptyToNull(body.data.websiteUrl),
    description:
      body.data.description === undefined ? undefined : emptyToNull(body.data.description),
  };

  const info = await prisma.businessInfo.upsert({
    where: { businessId: ctx.business.id },
    create: { businessId: ctx.business.id, ...data },
    update: data,
  });

  await writeAuditLog({
    businessId: ctx.business.id,
    session: ctx.session,
    action: "SETTINGS_CHANGE",
    entityType: "BusinessInfo",
    entityId: ctx.business.id,
    afterData: info,
  });

  return NextResponse.json({ ok: true, info });
}

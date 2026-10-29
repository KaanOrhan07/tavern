import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { uploadBookingImage } from "@/lib/storage";

const MAX_PHOTOS = 8;

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;
  const info = await prisma.businessInfo.findUnique({
    where: { businessId: ctx.business.id },
    select: { galleryUrls: true },
  });
  return NextResponse.json({ ok: true, gallery: info?.galleryUrls ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Fotoğraf gerekli" }, { status: 400 });
  }

  const current = await prisma.businessInfo.findUnique({
    where: { businessId: ctx.business.id },
    select: { galleryUrls: true },
  });
  if ((current?.galleryUrls.length ?? 0) >= MAX_PHOTOS) {
    return NextResponse.json({ error: `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz` }, { status: 400 });
  }

  let url: string;
  try {
    url = await uploadBookingImage(ctx.business.id, image, "gallery");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Görsel yüklenemedi" },
      { status: 400 }
    );
  }

  const next = [...(current?.galleryUrls ?? []), url];
  await prisma.businessInfo.upsert({
    where: { businessId: ctx.business.id },
    create: { businessId: ctx.business.id, galleryUrls: next },
    update: { galleryUrls: next },
  });

  return NextResponse.json({ ok: true, gallery: next });
}

export async function DELETE(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const url = new URL(request.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const current = await prisma.businessInfo.findUnique({
    where: { businessId: ctx.business.id },
    select: { galleryUrls: true },
  });
  const next = (current?.galleryUrls ?? []).filter((u) => u !== url);
  await prisma.businessInfo.update({
    where: { businessId: ctx.business.id },
    data: { galleryUrls: next },
  });

  return NextResponse.json({ ok: true, gallery: next });
}

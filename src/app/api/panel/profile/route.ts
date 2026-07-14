import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { uploadBusinessImage } from "@/lib/storage";

const nameSchema = z.string().min(1).max(80);

/** İşletme adı, logo ve banner güncelleme. */
export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const data: { name?: string; logoUrl?: string; bannerUrl?: string } = {};

  const nameRaw = String(form.get("name") ?? "").trim();
  if (nameRaw) {
    const parsed = nameSchema.safeParse(nameRaw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz işletme adı" }, { status: 400 });
    }
    data.name = parsed.data;
  }

  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      data.logoUrl = await uploadBusinessImage(ctx.business.id, logo, "logo");
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Logo yüklenemedi" },
        { status: 400 }
      );
    }
  }

  const banner = form.get("banner");
  if (banner instanceof File && banner.size > 0) {
    try {
      data.bannerUrl = await uploadBusinessImage(ctx.business.id, banner, "banner");
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Banner yüklenemedi" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const business = await prisma.business.update({
    where: { id: ctx.business.id },
    data,
    select: { name: true, logoUrl: true, bannerUrl: true },
  });

  return NextResponse.json({ ok: true, business });
}

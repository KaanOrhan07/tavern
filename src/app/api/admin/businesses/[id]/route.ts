import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  active: z.boolean(),
});

// Admin yalnızca aktif/pasif değiştirebilir (salt-okunur ilkesinin tek istisnası: bu ve feature flag'ler)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const business = await prisma.business.update({
    where: { id },
    data: { active: body.data.active },
  });
  return NextResponse.json({ ok: true, business });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";

const patchSchema = z.object({ status: z.enum(["PENDING", "DONE"]) });

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
  await prisma.staffRequest.updateMany({
    where: { id, businessId: ctx.business.id },
    data: {
      status: body.data.status,
      resolvedAt: body.data.status === "DONE" ? new Date() : null,
    },
  });
  return NextResponse.json({ ok: true });
}

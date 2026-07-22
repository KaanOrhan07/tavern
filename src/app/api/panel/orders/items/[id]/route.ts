import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { removeOrderItem } from "@/lib/orders";

const patchSchema = z
  .object({
    delivered: z.boolean().optional(),
    prepared: z.boolean().optional(),
  })
  .refine((d) => d.delivered !== undefined || d.prepared !== undefined, {
    message: "delivered veya prepared gerekli",
  });

// Teslim / hazırlandı işaretleme (birbirinden bağımsız)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const data: { delivered?: boolean; prepared?: boolean; preparedAt?: Date | null } = {};
  if (body.data.delivered !== undefined) data.delivered = body.data.delivered;
  if (body.data.prepared !== undefined) {
    data.prepared = body.data.prepared;
    data.preparedAt = body.data.prepared ? new Date() : null;
  }

  const updated = await prisma.orderItem.updateMany({
    where: { id, order: { businessId: ctx.business.id } },
    data,
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Kalem bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Sipariş kalemi silme (stok iadesiyle birlikte)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  try {
    await removeOrderItem(ctx.business.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kalem silinemedi" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { removeOrderItem } from "@/lib/orders";
import type { OrderItemStatus, Prisma } from "@/generated/prisma/client";

const patchSchema = z
  .object({
    delivered: z.boolean().optional(),
    prepared: z.boolean().optional(),
    status: z
      .enum(["PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"])
      .optional(),
  })
  .refine(
    (d) =>
      d.delivered !== undefined ||
      d.prepared !== undefined ||
      d.status !== undefined,
    { message: "delivered, prepared veya status gerekli" }
  );

// Teslim / hazırlandı işaretleme (boolean + status dual-write)
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

  const data: Prisma.OrderItemUpdateManyMutationInput = {};
  const now = new Date();

  if (body.data.status !== undefined) {
    const status = body.data.status as OrderItemStatus;
    data.status = status;
    if (status === "PREPARING") data.preparingAt = now;
    if (status === "READY") {
      data.prepared = true;
      data.preparedAt = now;
      data.readyAt = now;
    }
    if (status === "DELIVERED") {
      data.delivered = true;
      data.deliveredAt = now;
      data.prepared = true;
      data.preparedAt = data.preparedAt ?? now;
      data.readyAt = data.readyAt ?? now;
    }
    if (status === "PENDING") {
      data.prepared = false;
      data.preparedAt = null;
      data.delivered = false;
      data.deliveredAt = null;
    }
  }

  if (body.data.delivered !== undefined) {
    data.delivered = body.data.delivered;
    data.deliveredAt = body.data.delivered ? now : null;
    if (body.data.delivered) data.status = "DELIVERED";
    // Teslim geri alınırsa durum "Hazır"a döner (önceden DELIVERED'da takılı kalıyordu)
    else if (body.data.status === undefined && body.data.prepared === undefined) data.status = "READY";
  }
  if (body.data.prepared !== undefined) {
    data.prepared = body.data.prepared;
    data.preparedAt = body.data.prepared ? now : null;
    if (body.data.prepared) {
      data.status = "READY";
      data.readyAt = now;
    } else if (body.data.delivered !== true) {
      data.status = "PENDING";
      data.readyAt = null;
    }
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

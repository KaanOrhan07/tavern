import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { writeAuditLog } from "@/lib/audit";

/** Cihaz anahtarını iptal eder (geri alınamaz; cihaz anında yetkisini kaybeder). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const res = await prisma.deviceToken.updateMany({
    where: { id, businessId: ctx.business.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (res.count === 0) return NextResponse.json({ error: "Cihaz bulunamadı" }, { status: 404 });

  await writeAuditLog({
    businessId: ctx.business.id,
    session: ctx.session,
    action: "DELETE",
    entityType: "DeviceToken",
    entityId: id,
    metadata: { event: "revoked" },
  });
  return NextResponse.json({ ok: true });
}

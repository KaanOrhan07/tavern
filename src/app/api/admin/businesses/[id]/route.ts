import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";
import { isValidInvoiceProviderKey } from "@/lib/invoice/provider";

const patchSchema = z
  .object({
    active: z.boolean().optional(),
    /** e-Arşiv/e-Adisyon entegratörü (none = kapalı) */
    invoiceProvider: z.string().max(40).optional(),
  })
  .refine((d) => d.active !== undefined || d.invoiceProvider !== undefined, { message: "Değişiklik yok" });

/**
 * Aktif/Pasif: pasif işletmede panel, QR menü ve sipariş erişimi kapanır; VERİ SİLİNMEZ.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const before = await prisma.business.findUnique({ where: { id }, select: { active: true, name: true, invoiceProvider: true } });
  if (!before) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  if (body.data.invoiceProvider !== undefined && !isValidInvoiceProviderKey(body.data.invoiceProvider)) {
    return NextResponse.json({ error: "Geçersiz entegratör" }, { status: 400 });
  }

  const business = await prisma.business.update({
    where: { id },
    data: {
      ...(body.data.active !== undefined && { active: body.data.active }),
      ...(body.data.invoiceProvider !== undefined && { invoiceProvider: body.data.invoiceProvider }),
    },
  });
  await writeAdminAudit({
    admin: ctx.session,
    businessId: id,
    action: "SETTINGS_CHANGE",
    entityType: "Business",
    entityId: id,
    summary:
      body.data.invoiceProvider !== undefined
        ? `e-Arşiv entegratörü değiştirildi: ${before.name} → ${body.data.invoiceProvider}`
        : `İşletme ${body.data.active ? "aktif" : "pasif"} yapıldı: ${before.name}`,
    metadata: { before: { active: before.active, invoiceProvider: before.invoiceProvider }, after: body.data },
    request,
  });
  return NextResponse.json({ ok: true, business });
}

const deleteSchema = z.object({ confirmName: z.string().min(1) });

/**
 * Kalıcı silme (GERİ ALINAMAZ) — yalnızca ana admin, işletme adı yazılarak onaylanır.
 * Bağlı tüm veri (ürün, sipariş, personel, randevu…) onDelete: Cascade ile silinir.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;

  const { id } = await params;
  const body = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "İşletme adını yazarak onaylayın" }, { status: 400 });
  }
  const business = await prisma.business.findUnique({ where: { id }, select: { name: true, slug: true } });
  if (!business) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  if (body.data.confirmName.trim() !== business.name) {
    return NextResponse.json({ error: "İşletme adı eşleşmiyor" }, { status: 400 });
  }

  // Audit önce yazılır: silme sonrası businessId SetNull olur, ad metadata'da kalır
  await writeAdminAudit({
    admin: ctx.session,
    action: "DELETE",
    entityType: "Business",
    entityId: id,
    summary: `İşletme KALICI olarak silindi: ${business.name} (/${business.slug})`,
    request,
  });
  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

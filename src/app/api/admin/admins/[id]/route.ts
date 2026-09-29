import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { writeAdminAudit } from "@/lib/audit";
import { hashPassword, validateOwnerPassword } from "@/lib/password";

const patchSchema = z.object({
  active: z.boolean().optional(),
  password: z.string().min(1).max(200).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;
  const { id } = await params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { name: true } });
  if (!target) return NextResponse.json({ error: "Admin bulunamadı" }, { status: 404 });

  const data: { active?: boolean; passwordHash?: string; sessionVersion?: { increment: number } } = {};
  if (typeof body.data.active === "boolean") {
    data.active = body.data.active;
    if (!body.data.active) data.sessionVersion = { increment: 1 };
  }
  if (body.data.password) {
    const pwError = validateOwnerPassword(body.data.password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
    data.passwordHash = await hashPassword(body.data.password);
    data.sessionVersion = { increment: 1 };
  }
  await prisma.adminUser.update({ where: { id }, data });
  await writeAdminAudit({
    admin: ctx.session,
    action: "UPDATE",
    entityType: "AdminUser",
    entityId: id,
    summary: body.data.password
      ? `Alt admin şifresi değiştirildi: ${target.name}`
      : `Alt admin ${body.data.active ? "aktifleştirildi" : "pasifleştirildi"}: ${target.name}`,
    request,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;
  const { id } = await params;
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { name: true } });
  if (!target) return NextResponse.json({ error: "Admin bulunamadı" }, { status: 404 });
  await prisma.adminUser.delete({ where: { id } });
  await writeAdminAudit({
    admin: ctx.session,
    action: "DELETE",
    entityType: "AdminUser",
    entityId: id,
    summary: `Alt admin silindi: ${target.name}`,
    request,
  });
  return NextResponse.json({ ok: true });
}

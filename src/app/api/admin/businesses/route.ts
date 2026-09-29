import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isReservedBusinessSlug, slugify } from "@/lib/utils";
import { requireAdmin, isGuardError } from "@/lib/guard";
import { buildPasswordFields, validateOwnerPassword } from "@/lib/password";
import { writeAdminAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(2),
  typeId: z.string().min(1),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
});

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const { name, typeId, ownerName, ownerEmail, ownerPassword } = body.data;
  const pwError = validateOwnerPassword(ownerPassword);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const existingEmail = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });
  if (existingEmail) {
    return NextResponse.json(
      { error: "Bu e-posta zaten kullanımda" },
      { status: 409 }
    );
  }

  // Benzersiz slug üret (müşteri hesap route'ları rezerve)
  let base = slugify(name) || "isletme";
  if (isReservedBusinessSlug(base)) base = `${base}-isletme`;
  let slug = base;
  for (let i = 2; await prisma.business.findUnique({ where: { slug } }) || isReservedBusinessSlug(slug); i++) {
    slug = `${base}-${i}`;
  }

  const business = await prisma.business.create({
    data: {
      name,
      slug,
      typeId,
      users: {
        create: {
          role: "OWNER",
          name: ownerName,
          email: ownerEmail,
          ...(await buildPasswordFields(ownerPassword)),
        },
      },
    },
    include: { type: true },
  });

  if (business.type.key === "barber") {
    await prisma.barberSettings.create({
      data: { businessId: business.id },
    });
  }

  await writeAdminAudit({
    admin: ctx.session,
    businessId: business.id,
    action: "CREATE",
    entityType: "Business",
    entityId: business.id,
    summary: `İşletme oluşturuldu: ${business.name}`,
    request,
  });

  return NextResponse.json({ ok: true, business });
}

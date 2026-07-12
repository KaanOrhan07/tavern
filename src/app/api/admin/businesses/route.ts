import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(2),
  typeId: z.string().min(1),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
});

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const { name, typeId, ownerName, ownerEmail, ownerPassword } = body.data;

  const existingEmail = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });
  if (existingEmail) {
    return NextResponse.json(
      { error: "Bu e-posta zaten kullanımda" },
      { status: 409 }
    );
  }

  // Benzersiz slug üret
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await prisma.business.findUnique({ where: { slug } }); i++) {
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
          passwordHash: await bcrypt.hash(ownerPassword, 10),
        },
      },
    },
  });

  return NextResponse.json({ ok: true, business });
}

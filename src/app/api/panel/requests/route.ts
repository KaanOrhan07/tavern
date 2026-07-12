import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isFeatureEnabled } from "@/lib/features";

const createSchema = z.object({ text: z.string().min(2).max(500) });

export async function GET() {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  const requests = await prisma.staffRequest.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;

  if (!(await isFeatureEnabled(ctx.business.id, "staff_requests"))) {
    return NextResponse.json({ error: "Bu özellik kapalı" }, { status: 403 });
  }

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const [staffRequest] = await prisma.$transaction([
    prisma.staffRequest.create({
      data: {
        businessId: ctx.business.id,
        createdById: ctx.session.userId,
        text: body.data.text.trim(),
      },
    }),
    prisma.notification.create({
      data: {
        businessId: ctx.business.id,
        type: "NEW_REQUEST",
        message: `Yeni talep (${ctx.session.name}): ${body.data.text.slice(0, 60)}`,
      },
    }),
  ]);
  return NextResponse.json({ ok: true, request: staffRequest });
}

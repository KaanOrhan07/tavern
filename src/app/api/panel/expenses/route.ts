import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const createSchema = z.object({
  category: z.enum([
    "RENT",
    "SALARY",
    "SUPPLIER",
    "UTILITIES",
    "TAX",
    "MAINTENANCE",
    "MARKETING",
    "OTHER",
  ]),
  title: z.string().min(2).max(120),
  amountKurus: z.number().int().positive(),
  expenseDate: z.string().min(8),
  note: z.string().max(500).optional(),
});

export async function GET() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const expenses = await prisma.expense.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { expenseDate: "desc" },
    take: 200,
  });
  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      businessId: ctx.business.id,
      category: body.data.category,
      title: body.data.title.trim(),
      amountKurus: body.data.amountKurus,
      expenseDate: new Date(body.data.expenseDate),
      note: body.data.note,
      createdById: ctx.session.userId,
    },
  });

  await writeAuditLog({
    session: ctx.session,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    afterData: expense,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({ ok: true, expense });
}

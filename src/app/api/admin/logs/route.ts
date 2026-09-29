import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/guard";

const PAGE = 50;

/** Admin işlem logları — yalnızca ana admin görür. */
export async function GET(request: Request) {
  const ctx = await requireAdmin({ superOnly: true });
  if (isGuardError(ctx)) return ctx;

  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim();
  const cursor = sp.get("cursor");

  const rows = await prisma.auditLog.findMany({
    where: {
      userRole: { in: ["ADMIN_SUPER", "ADMIN_SUB"] },
      ...(q ? { userName: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      userName: true,
      userRole: true,
      action: true,
      entityType: true,
      metadata: true,
      createdAt: true,
      ipAddress: true,
    },
  });
  const hasMore = rows.length > PAGE;
  const items = rows.slice(0, PAGE).map((r) => ({
    id: r.id,
    adminName: r.userName ?? "—",
    level: r.userRole === "ADMIN_SUPER" ? "super" : "sub",
    summary: (r.metadata as { summary?: string } | null)?.summary ?? `${r.action} ${r.entityType}`,
    ip: r.ipAddress,
    createdAt: r.createdAt,
  }));
  return NextResponse.json({
    ok: true,
    items,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  });
}

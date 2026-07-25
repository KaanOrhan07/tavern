import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@/generated/prisma/client";
import type { PanelSession } from "@/lib/auth";

type AuditInput = {
  businessId?: string | null;
  session?: PanelSession | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Audit kaydı yazar. Hata olursa ana işlemi bozmaz. */
export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: input.businessId ?? input.session?.businessId ?? null,
        userId: input.session?.userId ?? null,
        userName: input.session?.name ?? null,
        userRole: input.session?.role ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeData: toJson(input.beforeData),
        afterData: toJson(input.afterData),
        metadata: toJson(input.metadata),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        requestId: input.requestId ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] write failed", err instanceof Error ? err.message : err);
  }
}

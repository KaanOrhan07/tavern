import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@/generated/prisma/client";
import type { AdminSession, PanelSession } from "@/lib/auth";

type AuditInput = {
  businessId?: string | null;
  session?: PanelSession | null;
  /** Panel oturumu olmayan aktörler (admin) için */
  actor?: { id: string; name: string; role: string } | null;
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
        userId: input.actor?.id ?? input.session?.userId ?? null,
        userName: input.actor?.name ?? input.session?.name ?? null,
        userRole: input.actor?.role ?? input.session?.role ?? null,
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

type AdminAuditInput = {
  admin: AdminSession;
  /** İnsan tarafından okunur işlem açıklaması (ör. "İşletme silindi: Köşk Kafe") */
  summary: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  businessId?: string | null;
  metadata?: unknown;
  request?: Request;
};

/** Admin işlemleri (ana admin dahil): ad soyad + işlem + zaman → /admin/loglar. */
export async function writeAdminAudit(input: AdminAuditInput) {
  const fwd = input.request?.headers.get("x-forwarded-for");
  await writeAuditLog({
    businessId: input.businessId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: { admin: true, summary: input.summary, ...(input.metadata as object | undefined) },
    ipAddress: fwd ? fwd.split(",")[0]?.trim() : null,
    userAgent: input.request?.headers.get("user-agent") ?? null,
    actor: {
      id: input.admin.adminUserId ?? "env-admin",
      name: input.admin.adminName,
      role: input.admin.level === "super" ? "ADMIN_SUPER" : "ADMIN_SUB",
    },
  });
}

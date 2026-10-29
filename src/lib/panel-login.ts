import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { PanelSession } from "@/lib/auth";
import { rateLimitAsync } from "@/lib/rate-limit";
import { defaultStaffPath } from "@/lib/business-modules";
import { hashPin, pinFingerprint, validatePinFormat, verifyPinHash } from "@/lib/pin";
import { verifyPassword } from "@/lib/password";
import { writeAuditLog } from "@/lib/audit";

/**
 * İşletme sahibi / personel giriş çekirdeği — web (cookie) ve native uygulamalar (/api/v1, Bearer token)
 * aynı doğrulamayı kullanır. Cookie ya da token verme işi çağırana bırakılır.
 */
export const panelLoginSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("owner"),
    slug: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1),
    remember: z.boolean().optional(),
  }),
  z.object({
    mode: z.literal("staff"),
    slug: z.string().min(1),
    pin: z.string().regex(/^\d{4,8}$/),
    remember: z.boolean().optional(),
  }),
]);
export type PanelLoginInput = z.infer<typeof panelLoginSchema>;

export type PanelLoginResult =
  | {
      ok: true;
      session: PanelSession;
      role: "owner" | "staff";
      redirectPath: string;
      business: { id: string; slug: string; name: string; typeKey: string; orderMode: string };
    }
  | { ok: false; status: number; error: string; retryAfterSec?: number };

const WINDOW_15 = 15 * 60 * 1000;

export async function authenticatePanel(
  data: PanelLoginInput,
  meta: { ip: string; userAgent: string | null; channel: "web" | "app" }
): Promise<PanelLoginResult> {
  const { ip, userAgent } = meta;

  const ipLimited = await rateLimitAsync(`panel-login:ip:${ip}`, { limit: 20, windowMs: WINDOW_15 });
  if (!ipLimited.ok) {
    return { ok: false, status: 429, error: "Çok fazla deneme, lütfen bekleyin", retryAfterSec: ipLimited.retryAfterSec };
  }

  const business = await prisma.business.findUnique({
    where: { slug: data.slug },
    include: { type: true },
  });
  if (!business) return { ok: false, status: 404, error: "İşletme bulunamadı" };
  if (!business.active) return { ok: false, status: 403, error: "Bu işletme şu anda pasif durumda" };

  const bizInfo = {
    id: business.id,
    slug: business.slug,
    name: business.name,
    typeKey: business.type.key,
    orderMode: business.orderMode,
  };

  if (data.mode === "owner") {
    const accountLimited = await rateLimitAsync(
      `panel-login:owner:${business.id}:${data.email.toLowerCase()}`,
      { limit: 8, windowMs: WINDOW_15 }
    );
    if (!accountLimited.ok) {
      return { ok: false, status: 429, error: "Çok fazla deneme, lütfen bekleyin", retryAfterSec: accountLimited.retryAfterSec };
    }

    const user = await prisma.user.findFirst({
      where: { businessId: business.id, role: "OWNER", email: data.email, active: true },
    });
    if (!user?.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
      return { ok: false, status: 401, error: "E-posta veya şifre hatalı" };
    }
    const session: PanelSession = {
      role: "owner",
      userId: user.id,
      businessId: business.id,
      businessSlug: business.slug,
      name: user.name,
      sessionVersion: user.sessionVersion,
      remember: data.remember === true,
    };
    await writeAuditLog({
      businessId: business.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
      userAgent,
      metadata: { mode: "owner", channel: meta.channel },
      session,
    });
    return { ok: true, session, role: "owner", redirectPath: `/panel/${business.slug}/dashboard`, business: bizInfo };
  }

  const pinError = validatePinFormat(data.pin);
  if (pinError) return { ok: false, status: 401, error: "PIN hatalı" };

  const staffLimited = await rateLimitAsync(`panel-login:staff:${business.id}:${ip}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!staffLimited.ok) {
    return { ok: false, status: 429, error: "Çok fazla deneme, lütfen bekleyin", retryAfterSec: staffLimited.retryAfterSec };
  }

  const fingerprint = pinFingerprint(business.id, data.pin);
  let staff = await prisma.user.findFirst({
    where: {
      businessId: business.id,
      role: "STAFF",
      active: true,
      OR: [{ pinFingerprint: fingerprint }, { pin: data.pin }],
    },
  });
  if (!staff) return { ok: false, status: 401, error: "PIN hatalı" };

  if (staff.pinHash) {
    if (!(await verifyPinHash(data.pin, staff.pinHash))) return { ok: false, status: 401, error: "PIN hatalı" };
  } else if (staff.pin === data.pin) {
    // Eski düz metin PIN → hash'e yükselt
    staff = await prisma.user.update({
      where: { id: staff.id },
      data: { pinHash: await hashPin(data.pin), pinFingerprint: fingerprint, pin: null },
    });
  } else {
    return { ok: false, status: 401, error: "PIN hatalı" };
  }

  const session: PanelSession = {
    role: "staff",
    userId: staff.id,
    businessId: business.id,
    businessSlug: business.slug,
    name: staff.name,
    sessionVersion: staff.sessionVersion,
    remember: data.remember === true,
  };
  await writeAuditLog({
    businessId: business.id,
    action: "LOGIN",
    entityType: "User",
    entityId: staff.id,
    ipAddress: ip,
    userAgent,
    metadata: { mode: "staff", channel: meta.channel },
    session,
  });
  return {
    ok: true,
    session,
    role: "staff",
    redirectPath: defaultStaffPath(business.slug, business.type.key),
    business: bizInfo,
  };
}

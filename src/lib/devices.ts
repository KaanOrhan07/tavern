import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { DeviceKind } from "@/generated/prisma/client";

/**
 * Cihaz anahtarları: masaüstü yazdırma ajanı, masaüstü/mobil uygulama cihazları gibi insan kullanıcısı
 * olmayan istemciler için uzun ömürlü, İPTAL EDİLEBİLİR anahtarlar. Yalnızca SHA-256 özeti saklanır;
 * anahtarın kendisi oluşturulurken bir kez gösterilir. Format: tvd_<43 karakter>.
 */
export const DEVICE_TOKEN_PREFIX = "tvd_";

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateDeviceToken(): string {
  return DEVICE_TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export async function createDevice(input: {
  businessId: string;
  kind: DeviceKind;
  name: string;
  createdById?: string | null;
}) {
  const token = generateDeviceToken();
  const device = await prisma.deviceToken.create({
    data: {
      businessId: input.businessId,
      kind: input.kind,
      name: input.name.trim().slice(0, 60),
      tokenHash: hashDeviceToken(token),
      createdById: input.createdById ?? null,
    },
    select: { id: true, name: true, kind: true, createdAt: true },
  });
  return { token, device };
}

export type DeviceContext = { deviceId: string; businessId: string; kind: DeviceKind; name: string };

/** `Authorization: Bearer tvd_…` ile gelen cihazı doğrular. Hata varsa NextResponse döner. */
export async function authenticateDevice(
  request: Request,
  allowed: DeviceKind[]
): Promise<DeviceContext | NextResponse> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(tvd_[A-Za-z0-9_-]+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Cihaz anahtarı gerekli" }, { status: 401 });

  const device = await prisma.deviceToken.findUnique({
    where: { tokenHash: hashDeviceToken(token) },
    include: { business: { select: { active: true } } },
  });
  if (!device || device.revokedAt) {
    return NextResponse.json({ error: "Geçersiz veya iptal edilmiş cihaz anahtarı" }, { status: 401 });
  }
  if (!device.business.active) {
    return NextResponse.json({ error: "İşletme aktif değil" }, { status: 403 });
  }
  if (!allowed.includes(device.kind)) {
    return NextResponse.json({ error: "Bu cihaz türü bu işlem için yetkili değil" }, { status: 403 });
  }

  // Son görülme: her istekte yazma yükü olmasın diye 60 sn'de bir
  if (!device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() > 60_000) {
    await prisma.deviceToken.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return { deviceId: device.id, businessId: device.businessId, kind: device.kind, name: device.name };
}

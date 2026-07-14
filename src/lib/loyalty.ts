import { prisma } from "@/lib/prisma";

export const DEFAULT_LOYALTY = {
  pointsPerSpendKurus: 100,
  redeemThresholdPoints: 100,
  redeemDiscountPercent: 10,
} as const;

/** Türkiye cep telefonu: 05xxxxxxxxx */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("05")) return digits;
  if (digits.length === 10 && digits.startsWith("5")) return `0${digits}`;
  return null;
}

export async function getLoyaltyConfig(businessId: string) {
  const row = await prisma.loyaltyConfig.findUnique({ where: { businessId } });
  return row ?? { businessId, ...DEFAULT_LOYALTY };
}

export async function getLoyaltyBalance(businessId: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const account = await prisma.loyaltyAccount.findUnique({
    where: { businessId_phone: { businessId, phone: normalized } },
  });
  const config = await getLoyaltyConfig(businessId);
  return {
    phone: normalized,
    points: account?.points ?? 0,
    config,
    canRedeem: (account?.points ?? 0) >= config.redeemThresholdPoints,
  };
}

export function calcDiscountKurus(subtotalKurus: number, discountPercent: number) {
  return Math.floor((subtotalKurus * discountPercent) / 100);
}

export function calcEarnedPoints(spentKurus: number, pointsPerSpendKurus: number) {
  if (pointsPerSpendKurus <= 0) return 0;
  return Math.floor(spentKurus / pointsPerSpendKurus);
}

export async function redeemLoyaltyPoints(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    businessId: string;
    phone: string;
    subtotalKurus: number;
  }
) {
  const normalized = normalizePhone(params.phone);
  if (!normalized) throw new Error("Geçersiz telefon numarası");

  const config = await tx.loyaltyConfig.findUnique({ where: { businessId: params.businessId } });
  const effective = config ?? { ...DEFAULT_LOYALTY };
  const account = await tx.loyaltyAccount.findUnique({
    where: { businessId_phone: { businessId: params.businessId, phone: normalized } },
  });
  if (!account || account.points < effective.redeemThresholdPoints) {
    throw new Error("Yeterli puan yok");
  }

  const discountKurus = calcDiscountKurus(params.subtotalKurus, effective.redeemDiscountPercent);
  if (discountKurus <= 0) throw new Error("İndirim uygulanamadı");

  await tx.loyaltyAccount.update({
    where: { id: account.id },
    data: { points: { decrement: effective.redeemThresholdPoints } },
  });

  return {
    redeemPoints: effective.redeemThresholdPoints,
    discountKurus,
    phone: normalized,
  };
}

export async function restoreLoyaltyRedeem(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: { businessId: string; phone: string; redeemPoints: number }
) {
  if (params.redeemPoints <= 0) return;
  const normalized = normalizePhone(params.phone);
  if (!normalized) return;

  await tx.loyaltyAccount.upsert({
    where: { businessId_phone: { businessId: params.businessId, phone: normalized } },
    create: {
      businessId: params.businessId,
      phone: normalized,
      points: params.redeemPoints,
    },
    update: { points: { increment: params.redeemPoints } },
  });
}

export async function earnLoyaltyPoints(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: { businessId: string; phone: string; spentKurus: number }
) {
  const normalized = normalizePhone(params.phone);
  if (!normalized) return 0;

  const config = await tx.loyaltyConfig.findUnique({ where: { businessId: params.businessId } });
  const effective = config ?? { ...DEFAULT_LOYALTY };
  const earned = calcEarnedPoints(params.spentKurus, effective.pointsPerSpendKurus);
  if (earned <= 0) return 0;

  await tx.loyaltyAccount.upsert({
    where: { businessId_phone: { businessId: params.businessId, phone: normalized } },
    create: {
      businessId: params.businessId,
      phone: normalized,
      points: earned,
    },
    update: { points: { increment: earned } },
  });

  return earned;
}

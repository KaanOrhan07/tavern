import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const DEFAULT_LOYALTY = {
  pointsPerSpendKurus: 100,
  redeemThresholdPoints: 100,
  redeemDiscountPercent: 10,
  earningMode: "spend_based" as const,
  fixedPointsPerCompletion: 10,
  tierSystemEnabled: true,
  referralInviterPoints: 50,
  referralInviteePoints: 25,
};

type Tx = Prisma.TransactionClient;

/** Türkiye cep telefonu: 05xxxxxxxxx */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("05")) return digits;
  if (digits.length === 10 && digits.startsWith("5")) return `0${digits}`;
  return null;
}

function makeReferralCode() {
  return randomBytes(4).toString("hex").toUpperCase();
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
    include: { tier: true },
  });
  const config = await getLoyaltyConfig(businessId);
  return {
    phone: normalized,
    points: account?.points ?? 0,
    lifetimeEarnedPoints: account?.lifetimeEarnedPoints ?? 0,
    referralCode: account?.referralCode ?? null,
    tier: account?.tier
      ? { name: account.tier.tierName, multiplier: account.tier.pointMultiplier }
      : null,
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

async function resolveTierId(tx: Tx, businessId: string, lifetimeEarnedPoints: number) {
  const config = await tx.loyaltyConfig.findUnique({ where: { businessId } });
  if (config && !config.tierSystemEnabled) return null;

  const tier = await tx.loyaltyTier.findFirst({
    where: { businessId, minLifetimePoints: { lte: lifetimeEarnedPoints } },
    orderBy: { minLifetimePoints: "desc" },
  });
  return tier?.id ?? null;
}

async function ensureAccount(tx: Tx, businessId: string, phone: string) {
  const existing = await tx.loyaltyAccount.findUnique({
    where: { businessId_phone: { businessId, phone } },
  });
  if (existing) {
    if (!existing.referralCode) {
      return tx.loyaltyAccount.update({
        where: { id: existing.id },
        data: { referralCode: makeReferralCode() },
      });
    }
    return existing;
  }
  return tx.loyaltyAccount.create({
    data: {
      businessId,
      phone,
      points: 0,
      lifetimeEarnedPoints: 0,
      referralCode: makeReferralCode(),
    },
  });
}

async function creditPoints(
  tx: Tx,
  params: {
    businessId: string;
    phone: string;
    points: number;
    sourceType: string;
    sourceEntityId?: string | null;
    countTowardLifetime?: boolean;
  }
) {
  if (params.points === 0) return 0;
  const account = await ensureAccount(tx, params.businessId, params.phone);
  const lifetimeDelta = params.countTowardLifetime !== false && params.points > 0 ? params.points : 0;
  const newLifetime = account.lifetimeEarnedPoints + lifetimeDelta;
  const newBalance = account.points + params.points;
  if (newBalance < 0) throw new Error("Yetersiz puan bakiyesi");

  const tierId = await resolveTierId(tx, params.businessId, newLifetime);

  const updated = await tx.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      points: newBalance,
      lifetimeEarnedPoints: newLifetime,
      tierId,
    },
  });

  await tx.loyaltyTransaction.create({
    data: {
      businessId: params.businessId,
      loyaltyAccountId: updated.id,
      sourceType: params.sourceType,
      sourceEntityId: params.sourceEntityId ?? null,
      points: params.points,
      balanceAfter: newBalance,
    },
  });

  return params.points;
}

export async function redeemLoyaltyPoints(
  tx: Tx,
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

  await creditPoints(tx, {
    businessId: params.businessId,
    phone: normalized,
    points: -effective.redeemThresholdPoints,
    sourceType: "redeem",
    countTowardLifetime: false,
  });

  return {
    redeemPoints: effective.redeemThresholdPoints,
    discountKurus,
    phone: normalized,
  };
}

export async function restoreLoyaltyRedeem(
  tx: Tx,
  params: { businessId: string; phone: string; redeemPoints: number }
) {
  if (params.redeemPoints <= 0) return;
  const normalized = normalizePhone(params.phone);
  if (!normalized) return;

  await creditPoints(tx, {
    businessId: params.businessId,
    phone: normalized,
    points: params.redeemPoints,
    sourceType: "redeem_restore",
    countTowardLifetime: false,
  });
}

export async function earnLoyaltyPoints(
  tx: Tx,
  params: {
    businessId: string;
    phone: string;
    spentKurus?: number;
    sourceType: string;
    sourceEntityId?: string;
  }
) {
  const normalized = normalizePhone(params.phone);
  if (!normalized) return 0;

  if (params.sourceEntityId) {
    const dup = await tx.loyaltyTransaction.findFirst({
      where: {
        businessId: params.businessId,
        sourceType: params.sourceType,
        sourceEntityId: params.sourceEntityId,
      },
    });
    if (dup) return 0;
  }

  const config = await tx.loyaltyConfig.findUnique({ where: { businessId: params.businessId } });
  const effective = config ?? { ...DEFAULT_LOYALTY };

  let base =
    effective.earningMode === "fixed"
      ? effective.fixedPointsPerCompletion
      : calcEarnedPoints(params.spentKurus ?? 0, effective.pointsPerSpendKurus);

  if (base <= 0) return 0;

  const account = await ensureAccount(tx, params.businessId, normalized);
  const isFirstEarn = account.lifetimeEarnedPoints === 0;
  const tier = account.tierId
    ? await tx.loyaltyTier.findUnique({ where: { id: account.tierId } })
    : null;
  const multiplier = tier?.pointMultiplier && tier.pointMultiplier > 0 ? tier.pointMultiplier : 1;
  const earned = Math.floor(base * multiplier);

  await creditPoints(tx, {
    businessId: params.businessId,
    phone: normalized,
    points: earned,
    sourceType: params.sourceType,
    sourceEntityId: params.sourceEntityId,
  });

  if (isFirstEarn && account.referredByPhone) {
    const inviterPoints = effective.referralInviterPoints;
    const inviteePoints = effective.referralInviteePoints;
    if (inviteePoints > 0) {
      await creditPoints(tx, {
        businessId: params.businessId,
        phone: normalized,
        points: inviteePoints,
        sourceType: "referral",
        sourceEntityId: `invitee:${params.sourceEntityId ?? normalized}`,
      });
    }
    if (inviterPoints > 0 && account.referredByPhone !== normalized) {
      await creditPoints(tx, {
        businessId: params.businessId,
        phone: account.referredByPhone,
        points: inviterPoints,
        sourceType: "referral",
        sourceEntityId: `inviter:${normalized}:${params.sourceEntityId ?? "first"}`,
      });
    }
  }

  return earned;
}

/** Davet kodunu bağla (ilk tamamlamadan önce). */
export async function attachReferralCode(
  businessId: string,
  phone: string,
  referralCode: string
) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("Geçersiz telefon");
  const code = referralCode.trim().toUpperCase();
  if (!code) throw new Error("Geçersiz davet kodu");

  const inviter = await prisma.loyaltyAccount.findFirst({
    where: { businessId, referralCode: code },
  });
  if (!inviter) throw new Error("Davet kodu bulunamadı");
  if (inviter.phone === normalized) throw new Error("Kendi davet kodunuzu kullanamazsınız");

  await prisma.$transaction(async (tx) => {
    const account = await ensureAccount(tx, businessId, normalized);
    if (account.referredByPhone) throw new Error("Davet kodu zaten uygulanmış");
    if (account.lifetimeEarnedPoints > 0) {
      throw new Error("İlk alışverişten sonra davet kodu uygulanamaz");
    }
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { referredByPhone: inviter.phone },
    });
  });
}

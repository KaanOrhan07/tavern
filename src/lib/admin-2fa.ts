import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { currentStep, verifyTotp } from "@/lib/totp";

/**
 * Admin iki adımlı doğrulama (TOTP) saklaması.
 *  - Alt admin: AdminUser.twoFactorSecret (şifreli) + twoFactorEnabled + twoFactorLastStep
 *  - Ana admin (env key, DB satırı yok): SystemSetting "admin_super_2fa" içinde şifreli JSON
 *
 * Acil durum: Vercel'e ADMIN_TOTP_DISABLE=1 eklenirse TOTP şartı geçici olarak atlanır (telefon kaybı vb.).
 * Kurtarma sonrası kaldırın ve 2FA'yı yeniden kurun.
 */
export type Actor = { level: "super" | "sub"; adminUserId?: string };

type State = { secret: string | null; enabled: boolean; lastStep: number | null };

const SUPER_KEY = "admin_super_2fa";

export function totpBypassed(): boolean {
  return process.env.ADMIN_TOTP_DISABLE === "1" || process.env.ADMIN_TOTP_DISABLE === "true";
}

async function readSuper(): Promise<State> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SUPER_KEY } });
  if (!row) return { secret: null, enabled: false, lastStep: null };
  try {
    return JSON.parse(decryptSecret(row.valueEnc)) as State;
  } catch {
    return { secret: null, enabled: false, lastStep: null };
  }
}

async function writeSuper(state: State) {
  await prisma.systemSetting.upsert({
    where: { key: SUPER_KEY },
    create: { key: SUPER_KEY, valueEnc: encryptSecret(JSON.stringify(state)), updatedBy: "super" },
    update: { valueEnc: encryptSecret(JSON.stringify(state)), updatedBy: "super" },
  });
}

export async function get2faState(actor: Actor): Promise<State> {
  if (actor.level === "super") return readSuper();
  const row = actor.adminUserId
    ? await prisma.adminUser.findUnique({
        where: { id: actor.adminUserId },
        select: { twoFactorSecret: true, twoFactorEnabled: true, twoFactorLastStep: true },
      })
    : null;
  let secret: string | null = null;
  if (row?.twoFactorSecret) {
    try {
      secret = decryptSecret(row.twoFactorSecret);
    } catch {
      secret = null;
    }
  }
  return { secret, enabled: Boolean(row?.twoFactorEnabled && secret), lastStep: row?.twoFactorLastStep ?? null };
}

async function save(actor: Actor, state: State) {
  if (actor.level === "super") return writeSuper(state);
  await prisma.adminUser.update({
    where: { id: actor.adminUserId! },
    data: {
      twoFactorSecret: state.secret ? encryptSecret(state.secret) : null,
      twoFactorEnabled: state.enabled,
      twoFactorLastStep: state.lastStep,
    },
  });
}

/** Kurulum başlat: yeni sır üretir, henüz AKTİF DEĞİL (kod doğrulanınca aktifleşir). */
export async function begin2faSetup(actor: Actor, secret: string) {
  await save(actor, { secret, enabled: false, lastStep: null });
}

export type VerifyResult = { ok: true } | { ok: false; reason: "invalid" | "replay" | "not_set" };

/** Kodu doğrular ve tekrar kullanımı engellemek için adımı kaydeder. `pendingOk`: kurulum sırasında henüz aktif olmayan sırrı da kabul eder. */
export async function verify2faCode(actor: Actor, code: string, opts?: { pendingOk?: boolean }): Promise<VerifyResult> {
  const state = await get2faState(actor);
  if (!state.secret || (!state.enabled && !opts?.pendingOk)) return { ok: false, reason: "not_set" };
  const step = verifyTotp(state.secret, code);
  if (step === null) return { ok: false, reason: "invalid" };
  if (state.lastStep !== null && step <= state.lastStep) return { ok: false, reason: "replay" };
  await save(actor, { ...state, lastStep: step });
  return { ok: true };
}

export async function enable2fa(actor: Actor) {
  const state = await get2faState(actor);
  if (!state.secret) throw new Error("Önce kurulumu başlatın");
  await save(actor, { ...state, enabled: true, lastStep: state.lastStep ?? currentStep() });
}

export async function disable2fa(actor: Actor) {
  await save(actor, { secret: null, enabled: false, lastStep: null });
}

/** Ana admin başka bir alt adminin 2FA'sını sıfırlar (cihaz kaybı). */
export async function reset2faFor(adminUserId: string) {
  await prisma.adminUser.update({
    where: { id: adminUserId },
    data: { twoFactorSecret: null, twoFactorEnabled: false, twoFactorLastStep: null },
  });
}

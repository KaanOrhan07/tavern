import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const COMMON = new Set([
  "password",
  "password1",
  "1234567890",
  "qwerty123",
  "admin12345",
  "tavern1234",
  "welcome123",
]);

export function validateOwnerPassword(password: string): string | null {
  if (password.length < 10) return "Şifre en az 10 karakter olmalı";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Şifre en az bir harf ve bir rakam içermeli";
  }
  if (COMMON.has(password.toLowerCase())) {
    return "Bu şifre çok yaygın, daha güçlü bir şifre seçin";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Şifre değişiminde hem doğrulama hash'i hem (yapılandırılmışsa) AES-256-GCM kopyası üretir.
 * İkisi her zaman birlikte güncellenir.
 */
export async function buildPasswordFields(password: string) {
  const { encryptSecret, isEncryptionConfigured } = await import("@/lib/crypto");
  return {
    passwordHash: await hashPassword(password),
    passwordEncrypted: isEncryptionConfigured() ? encryptSecret(password) : null,
  };
}

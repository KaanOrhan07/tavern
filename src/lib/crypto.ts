import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * AES-256-GCM ile geri döndürülebilir şifreleme (işletme şifresi kopyası, Groq key).
 * Anahtar: CREDENTIAL_ENCRYPTION_KEY — AUTH_SECRET ile ASLA aynı olmamalı.
 */
function encryptionKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY tanımlı değil (en az 32 karakter)");
  }
  if (secret === process.env.AUTH_SECRET) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY, AUTH_SECRET ile aynı olamaz");
  }
  return createHash("sha256").update(secret).digest();
}

export function isEncryptionConfigured(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

/** Çıktı biçimi: v1.<iv>.<tag>.<ciphertext> (base64url) */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Geçersiz şifreli veri");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Alt admin giriş anahtarı için deterministik parmak izi (düz metin saklanmaz). */
export function adminKeyFingerprint(key: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil");
  return createHmac("sha256", secret).update(`admin-key:${key}`).digest("hex");
}

/** Zamanlama saldırılarına dayanıklı string karşılaştırma. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

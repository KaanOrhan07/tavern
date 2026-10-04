import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "crypto";

/**
 * AES-256-GCM ile geri döndürülebilir şifreleme (işletme şifresi kopyası, API key'ler).
 *
 * Anahtar önceliği:
 *  1) CREDENTIAL_ENCRYPTION_KEY (önerilen, AUTH_SECRET'tan AYRI en az 32 karakter)
 *  2) Yedek: AUTH_SECRET'tan HKDF ile TÜRETİLEN ayrı alan anahtarı ("tavern-credential-v1").
 *     Böylece env eklenmeden de çalışır; ama AUTH_SECRET sızarsa bu da açılır — kalıcı çözüm olarak
 *     CREDENTIAL_ENCRYPTION_KEY tanımlanmalı. Sonradan tanımlanırsa eski (türetilmiş anahtarla
 *     şifrelenmiş) kayıtlar okunmaya devam eder.
 */
function dedicatedKey(): Buffer | null {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) return null;
  if (secret === process.env.AUTH_SECRET) return null; // AUTH_SECRET ile aynı değer ayrı anahtar sayılmaz
  return createHash("sha256").update(secret).digest();
}

function derivedKey(): Buffer {
  const base = process.env.AUTH_SECRET;
  if (!base) throw new Error("AUTH_SECRET tanımlı değil");
  return Buffer.from(hkdfSync("sha256", base, "tavern-salt-v1", "tavern-credential-v1", 32));
}

export function isEncryptionConfigured(): boolean {
  return dedicatedKey() !== null || Boolean(process.env.AUTH_SECRET);
}

/** true → ayrı CREDENTIAL_ENCRYPTION_KEY kullanılıyor; false → AUTH_SECRET'tan türetilen yedek. */
export function usingDedicatedKey(): boolean {
  return dedicatedKey() !== null;
}

/** Çıktı biçimi: v1.<iv>.<tag>.<ciphertext> (base64url) */
export function encryptSecret(plain: string): string {
  const key = dedicatedKey() ?? derivedKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Geçersiz şifreli veri");
  const keys = [dedicatedKey(), process.env.AUTH_SECRET ? derivedKey() : null].filter(
    (k): k is Buffer => k !== null
  );
  let lastError: unknown = new Error("Şifreleme anahtarı yok");
  for (const key of keys) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(data, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
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

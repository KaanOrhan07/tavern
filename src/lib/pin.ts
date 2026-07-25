import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

const WEAK_PINS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
  "1212",
  "1122",
  "123456",
  "654321",
  "000000",
  "111111",
]);

export function validatePinFormat(pin: string): string | null {
  if (!/^\d{4,8}$/.test(pin)) return "PIN 4–8 haneli rakam olmalı";
  if (WEAK_PINS.has(pin)) return "Bu PIN çok yaygın, daha güçlü bir PIN seçin";
  if (/^(\d)\1+$/.test(pin)) return "Bu PIN çok yaygın, daha güçlü bir PIN seçin";
  return null;
}

function hmacSecret() {
  return process.env.PIN_HMAC_SECRET || process.env.AUTH_SECRET || "dev-pin-hmac";
}

export function pinFingerprint(businessId: string, pin: string): string {
  return createHmac("sha256", hmacSecret())
    .update(`${businessId}:${pin}`)
    .digest("hex");
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPinHash(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function fingerprintsEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

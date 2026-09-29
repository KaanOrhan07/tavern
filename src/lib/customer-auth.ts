import { SignJWT, jwtVerify } from "jose";
import { createHash, randomInt } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPin, validatePinFormat, verifyPinHash } from "@/lib/pin";
import { normalizePhone } from "@/lib/loyalty";
import { sendSms } from "@/lib/sms";
import { rateLimitAsync } from "@/lib/rate-limit";

export const CUSTOMER_COOKIE = "tavern_customer";
const OTP_TTL_SEC = 10 * 60;
/** "Beni hatırla" işaretliyse 90 gün, değilse tarayıcı kapanınca biten oturum çerezi (token 24 saat). */
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 90;
type OtpPurpose = "customer_otp" | "customer_pin_reset";

export type CustomerSession = {
  role: "customer";
  profileId: string;
  phone: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil");
  return new TextEncoder().encode(secret);
}

function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

function otpDebugEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.CUSTOMER_OTP_DEBUG === "1" ||
    process.env.CUSTOMER_OTP_DEBUG === "true"
  );
}

export async function createOtpChallenge(phone: string, purpose: OtpPurpose = "customer_otp") {
  const otp = String(randomInt(100000, 1000000));
  const token = await new SignJWT({
    phone,
    otpHash: hashOtp(otp),
    purpose,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SEC}s`)
    .sign(secretKey());

  return { challengeToken: token, otp, debugOtp: otpDebugEnabled() ? otp : undefined };
}

/** Kodu SMS ile gönderir. Aynı numaraya kısa sürede tekrar gönderim sınırlıdır (SMS maliyeti/kötüye kullanım). */
export async function issueOtp(phone: string, purpose: OtpPurpose = "customer_otp") {
  const limited = await rateLimitAsync(`otp-send:${purpose}:${phone}`, {
    limit: 3,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) throw new Error("Çok fazla kod istendi, birkaç dakika sonra tekrar deneyin");

  const { otp, ...challenge } = await createOtpChallenge(phone, purpose);
  const text =
    purpose === "customer_pin_reset"
      ? `Tavern PIN sıfırlama kodunuz: ${otp}. Kimseyle paylaşmayın.`
      : `Tavern doğrulama kodunuz: ${otp}. Kimseyle paylaşmayın.`;
  await sendSms(phone, text, "otp");
  return challenge;
}

export async function verifyOtpChallenge(
  challengeToken: string,
  otp: string,
  phone: string,
  purpose: OtpPurpose = "customer_otp"
) {
  // Deneme sayısı telefon başına sınırlı (6 haneli kod brute-force'a karşı)
  const limited = await rateLimitAsync(`otp-verify:${phone}`, { limit: 6, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return false;
  try {
    // ⚠️ TEST AŞAMASI: debug modunda (dev veya CUSTOMER_OTP_DEBUG=1) "000000" her zaman geçerli.
    // Netgsm canlıya alındığında CUSTOMER_OTP_DEBUG env'ini KALDIRIN (bu blok prod'da devre dışı kalır).
    const bypass = otpDebugEnabled() && otp === "000000";
    const { payload } = await jwtVerify(challengeToken, secretKey());
    if (payload.purpose !== purpose) return false;
    if (payload.phone !== phone) return false;
    return bypass || payload.otpHash === hashOtp(otp);
  } catch {
    return false;
  }
}

export async function registerCustomerProfile(input: {
  phone: string;
  pin: string;
  fullName?: string;
}) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Geçersiz telefon numarası");
  const pinErr = validatePinFormat(input.pin);
  if (pinErr) throw new Error(pinErr);
  if (!/^\d{6}$/.test(input.pin)) throw new Error("Müşteri PIN'i 6 haneli olmalı");

  const existing = await prisma.customerProfile.findUnique({ where: { phone } });
  if (existing?.phoneVerified) throw new Error("Bu telefon zaten kayıtlı");

  const pinHash = await hashPin(input.pin);
  const profile = existing
    ? await prisma.customerProfile.update({
        where: { id: existing.id },
        data: {
          pinHash,
          fullName: input.fullName?.trim() || existing.fullName,
          phoneVerified: false,
          accountStatus: "active",
          failedPinAttempts: 0,
          lockedUntil: null,
        },
      })
    : await prisma.customerProfile.create({
        data: {
          phone,
          pinHash,
          fullName: input.fullName?.trim() || null,
          phoneVerified: false,
        },
      });

  const challenge = await issueOtp(phone);
  return { profileId: profile.id, phone, ...challenge };
}

export async function confirmCustomerOtp(input: {
  phone: string;
  otp: string;
  challengeToken: string;
}) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Geçersiz telefon");
  const ok = await verifyOtpChallenge(input.challengeToken, input.otp, phone);
  if (!ok) throw new Error("Doğrulama kodu hatalı veya süresi dolmuş");

  return prisma.customerProfile.update({
    where: { phone },
    data: { phoneVerified: true, lastLoginAt: new Date(), failedPinAttempts: 0 },
  });
}

export async function loginCustomer(input: { phone: string; pin: string }) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Geçersiz telefon veya PIN");

  const profile = await prisma.customerProfile.findUnique({ where: { phone } });
  if (!profile || !profile.phoneVerified || !profile.pinHash) {
    throw new Error("Geçersiz telefon veya PIN");
  }
  if (profile.accountStatus !== "active") throw new Error("Hesap askıda");
  if (profile.lockedUntil && profile.lockedUntil > new Date()) {
    throw new Error("Hesap geçici olarak kilitli");
  }

  const valid = await verifyPinHash(input.pin, profile.pinHash);
  if (!valid) {
    const attempts = profile.failedPinAttempts + 1;
    const lockMinutes = attempts >= 5 ? (attempts >= 8 ? 60 : 15) : 0;
    await prisma.customerProfile.update({
      where: { id: profile.id },
      data: {
        failedPinAttempts: attempts,
        lockedUntil: lockMinutes ? new Date(Date.now() + lockMinutes * 60_000) : null,
      },
    });
    throw new Error("Geçersiz telefon veya PIN");
  }

  return prisma.customerProfile.update({
    where: { id: profile.id },
    data: { failedPinAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export async function createCustomerSessionToken(
  profile: { id: string; phone: string },
  remember = false
) {
  return new SignJWT({
    role: "customer",
    profileId: profile.id,
    phone: profile.phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "90d" : "24h")
    .sign(secretKey());
}

export async function setCustomerSessionCookie(token: string, remember = false) {
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // maxAge yok → oturum çerezi: tarayıcı kapanınca biter
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });
}

/** PIN sıfırlama: telefon kayıtlıysa SMS gider. Hesabın varlığı ifşa edilmez (her zaman aynı yanıt). */
export async function requestPinReset(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error("Geçersiz telefon numarası");
  const profile = await prisma.customerProfile.findUnique({ where: { phone } });
  if (profile?.phoneVerified && profile.accountStatus === "active") {
    return issueOtp(phone, "customer_pin_reset");
  }
  // Var olmayan hesap için de geçerli görünen ama doğrulanamayacak bir challenge döner
  const { otp: _unused, ...challenge } = await createOtpChallenge(phone, "customer_pin_reset");
  void _unused;
  return { ...challenge, debugOtp: undefined };
}

export async function confirmPinReset(input: {
  phone: string;
  otp: string;
  challengeToken: string;
  newPin: string;
}) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Geçersiz telefon");
  const pinErr = validatePinFormat(input.newPin);
  if (pinErr) throw new Error(pinErr);
  if (!/^d{6}$/.test(input.newPin)) throw new Error("PIN 6 haneli olmalı");

  const ok = await verifyOtpChallenge(input.challengeToken, input.otp, phone, "customer_pin_reset");
  if (!ok) throw new Error("Doğrulama kodu hatalı veya süresi dolmuş");

  const profile = await prisma.customerProfile.findUnique({ where: { phone } });
  if (!profile || !profile.phoneVerified || profile.accountStatus !== "active") {
    throw new Error("Doğrulama kodu hatalı veya süresi dolmuş");
  }
  return prisma.customerProfile.update({
    where: { id: profile.id },
    data: {
      pinHash: await hashPin(input.newPin),
      forcePinChange: false,
      failedPinAttempts: 0,
      lockedUntil: null,
    },
  });
}

export async function clearCustomerSessionCookie() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== "customer" || !payload.profileId || !payload.phone) return null;
    return {
      role: "customer",
      profileId: String(payload.profileId),
      phone: String(payload.phone),
    };
  } catch {
    return null;
  }
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) throw new Error("Giriş gerekli");
  return session;
}

/** Sipariş/randevu tamamlanınca ziyaret sayacı. */
export async function bumpCustomerVisit(phone: string | null | undefined) {
  const normalized = phone ? normalizePhone(phone) : null;
  if (!normalized) return;
  await prisma.customerProfile.updateMany({
    where: { phone: normalized, phoneVerified: true },
    data: { totalVisits: { increment: 1 } },
  });
}

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "tavern_admin";
const PANEL_COOKIE = "tavern_session";
const SESSION_DURATION = "12h";

export type AdminSession = {
  role: "admin";
  /** "super": env ADMIN_KEY ile giren ana admin. "sub": ana adminin oluşturduğu alt admin. */
  level: "super" | "sub";
  adminUserId?: string;
  adminName: string;
  sessionVersion?: number;
};

export type PanelSession = {
  role: "owner" | "staff";
  userId: string;
  businessId: string;
  businessSlug: string;
  name: string;
  sessionVersion: number;
  /** "Beni hatırla": true → 90 gün kalıcı oturum, false → tarayıcı kapanınca biten oturum */
  remember?: boolean;
};

const REMEMBER_SECONDS = 60 * 60 * 24 * 90;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil");
  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, unknown>, duration: string = SESSION_DURATION) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(duration)
    .sign(secretKey());
}

async function verify<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as T;
  } catch {
    return null;
  }
}

// --- Admin ---

export async function createAdminSession(extra: {
  level: "super" | "sub";
  adminName: string;
  adminUserId?: string;
  sessionVersion?: number;
}) {
  const token = await sign({
    role: "admin",
    level: extra.level,
    adminName: extra.adminName,
    adminUserId: extra.adminUserId,
    sessionVersion: extra.sessionVersion ?? 1,
  });
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await verify<AdminSession>(token);
  if (session?.role !== "admin") return null;
  // Eski (2.1.x) token'larda level yoktu — sadece env-key ile girilebildiği için super sayılır
  return { ...session, level: session.level ?? "super", adminName: session.adminName ?? "Ana Admin" };
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

// --- Panel (işletme sahibi + garson) ---

export async function createPanelSession(session: PanelSession) {
  const remember = session.remember === true;
  const token = await sign({ ...session }, remember ? "90d" : SESSION_DURATION);
  (await cookies()).set(PANEL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // maxAge yoksa oturum çerezi: tarayıcı kapanınca sonlanır
    ...(remember ? { maxAge: REMEMBER_SECONDS } : {}),
  });
}

export async function getPanelSession(): Promise<PanelSession | null> {
  const token = (await cookies()).get(PANEL_COOKIE)?.value;
  if (!token) return null;
  const session = await verify<PanelSession>(token);
  if (!session || (session.role !== "owner" && session.role !== "staff")) return null;
  return {
    ...session,
    sessionVersion: session.sessionVersion ?? 1,
  };
}

export async function destroyPanelSession() {
  (await cookies()).delete(PANEL_COOKIE);
}

/** Belirli bir işletme için oturum döndürür; eşleşmiyorsa null. */
export async function getPanelSessionFor(businessSlug: string) {
  const session = await getPanelSession();
  if (!session || session.businessSlug !== businessSlug) return null;
  return session;
}

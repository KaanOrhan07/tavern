import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "tavern_admin";
const PANEL_COOKIE = "tavern_session";
const SESSION_DURATION = "12h";

export type AdminSession = { role: "admin" };
export type PanelSession = {
  role: "owner" | "staff";
  userId: string;
  businessId: string;
  businessSlug: string;
  name: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil");
  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
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

export async function createAdminSession() {
  const token = await sign({ role: "admin" });
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
  return session?.role === "admin" ? session : null;
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

// --- Panel (işletme sahibi + garson) ---

export async function createPanelSession(session: PanelSession) {
  const token = await sign({ ...session });
  (await cookies()).set(PANEL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getPanelSession(): Promise<PanelSession | null> {
  const token = (await cookies()).get(PANEL_COOKIE)?.value;
  if (!token) return null;
  const session = await verify<PanelSession>(token);
  return session?.role === "owner" || session?.role === "staff" ? session : null;
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

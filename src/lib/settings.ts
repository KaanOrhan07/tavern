import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

const GROQ_KEY = "groq_api_key";
const CACHE_MS = 30_000;
let groqCache: { value: string | null; at: number } | null = null;

export async function getGroqApiKey(): Promise<string | null> {
  if (groqCache && Date.now() - groqCache.at < CACHE_MS) {
    return groqCache.value ?? process.env.GROQ_API_KEY ?? null;
  }
  let value: string | null = null;
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: GROQ_KEY } });
    if (row) value = decryptSecret(row.valueEnc);
  } catch (err) {
    console.error("[settings] Groq key okunamadı, env'e düşülüyor", err instanceof Error ? err.message : err);
  }
  groqCache = { value, at: Date.now() };
  return value ?? process.env.GROQ_API_KEY ?? null;
}

export async function setGroqApiKey(key: string, updatedBy: string | null) {
  await prisma.systemSetting.upsert({
    where: { key: GROQ_KEY },
    create: { key: GROQ_KEY, valueEnc: encryptSecret(key), updatedBy },
    update: { valueEnc: encryptSecret(key), updatedBy },
  });
  groqCache = null;
}

export async function getGroqKeyStatus() {
  const row = await prisma.systemSetting.findUnique({ where: { key: GROQ_KEY } });
  return {
    source: row ? ("db" as const) : process.env.GROQ_API_KEY ? ("env" as const) : ("none" as const),
    updatedAt: row?.updatedAt ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}

/** UI'da göstermek için maskeli key (ilk 4 + son 4). */
export function maskKey(key: string): string {
  if (key.length <= 10) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function getIdempotencyKey(request: Request): string | null {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 128) return null;
  return key;
}

export async function beginIdempotent(params: {
  businessId: string;
  key: string;
  endpoint: string;
}): Promise<
  | { kind: "cached"; response: NextResponse }
  | { kind: "proceed"; recordId: string }
  | { kind: "conflict" }
> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      businessId_key_endpoint: {
        businessId: params.businessId,
        key: params.key,
        endpoint: params.endpoint,
      },
    },
  });

  if (existing) {
    if (existing.expiresAt < new Date()) {
      await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => null);
    } else if (existing.responseCode != null && existing.responseBody != null) {
      return {
        kind: "cached",
        response: NextResponse.json(existing.responseBody, {
          status: existing.responseCode,
          headers: { "X-Idempotent-Replay": "true" },
        }),
      };
    } else {
      return { kind: "conflict" };
    }
  }

  try {
    const record = await prisma.idempotencyKey.create({
      data: {
        businessId: params.businessId,
        key: params.key,
        endpoint: params.endpoint,
        expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
      },
    });
    return { kind: "proceed", recordId: record.id };
  } catch {
    return { kind: "conflict" };
  }
}

export async function completeIdempotent(params: {
  recordId: string;
  responseCode: number;
  responseBody: unknown;
}) {
  await prisma.idempotencyKey.update({
    where: { id: params.recordId },
    data: {
      responseCode: params.responseCode,
      responseBody: params.responseBody as Prisma.InputJsonValue,
    },
  });
}

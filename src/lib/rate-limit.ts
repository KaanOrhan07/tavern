/**
 * Merkezi rate limit: Upstash Redis varsa onu kullanır,
 * yoksa process-local Map ile fallback yapar (dev / tek instance).
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

function memoryLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): LimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}

let redisReady: Promise<
  | {
      limit: (
        key: string,
        opts: { limit: number; windowMs: number }
      ) => Promise<LimitResult>;
    }
  | null
> | null = null;

async function getRedisLimiter() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  redisReady ??= (async () => {
    try {
      const { Redis } = await import("@upstash/redis");
      const { Ratelimit } = await import("@upstash/ratelimit");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const cache = new Map<string, InstanceType<typeof Ratelimit>>();

      return {
        async limit(key: string, opts: { limit: number; windowMs: number }) {
          const cacheKey = `${opts.limit}:${opts.windowMs}`;
          let limiter = cache.get(cacheKey);
          if (!limiter) {
            limiter = new Ratelimit({
              redis,
              limiter: Ratelimit.slidingWindow(
                opts.limit,
                `${Math.max(1, Math.round(opts.windowMs / 1000))} s`
              ),
              prefix: "tavern:rl",
            });
            cache.set(cacheKey, limiter);
          }
          const result = await limiter.limit(key);
          if (result.success) return { ok: true as const };
          return {
            ok: false as const,
            retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
          };
        },
      };
    } catch {
      return null;
    }
  })();
  return redisReady;
}

export async function rateLimitAsync(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<LimitResult> {
  const redis = await getRedisLimiter();
  if (redis) return redis.limit(key, opts);
  return memoryLimit(key, opts);
}

/** Sync API — Redis yoksa memory; varsa fire-and-forget memory (geriye uyumluluk). */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): LimitResult {
  return memoryLimit(key, opts);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

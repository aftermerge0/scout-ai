import { env } from "@/lib/env";

/**
 * Best-effort, in-memory rate limiting (Phase 4). Explicitly not durable or
 * shared across serverless instances (see docs/PLAN.md non-goals: no Redis
 * for MVP) — this bounds obvious abuse/loops in a single warm instance, not
 * a hard security guarantee.
 */

type Bucket = { count: number; windowStartMs: number };

type RateLimitGlobal = typeof globalThis & { __scoutRateLimit?: Map<string, Bucket> };

function getBuckets(): Map<string, Bucket> {
  const g = globalThis as RateLimitGlobal;
  if (!g.__scoutRateLimit) g.__scoutRateLimit = new Map();
  return g.__scoutRateLimit;
}

const WINDOW_MS = 60_000;

/** Returns true if the request is allowed, false if the caller should be rate limited. */
export function checkRateLimit(key: string, nowMs: number = Date.now()): boolean {
  const buckets = getBuckets();
  const bucket = buckets.get(key);

  if (!bucket || nowMs - bucket.windowStartMs >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStartMs: nowMs });
    return true;
  }

  if (bucket.count >= env.SCOUT_RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function clientIpFrom(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Redis-backed sliding-window rate limiter using @upstash/ratelimit.
 *
 * Falls back to the in-memory implementation if Redis isn't configured,
 * so development works without Upstash credentials.
 *
 * In production (Vercel serverless), the Redis implementation is required
 * because in-memory state doesn't persist across function instances.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient, isRedisConfigured } from "@/lib/redis";
import { checkRateLimit, RateLimitConfig, RateLimitResult } from "@/lib/rateLimit";

// Cache Ratelimit instances so we don't recreate them on every request
const rateLimiters = new Map<string, Ratelimit>();

function getRateLimiter(key: string, config: RateLimitConfig): Ratelimit {
  const cacheKey = `${key}:${config.maxRequests}:${config.windowMs}`;
  if (rateLimiters.has(cacheKey)) return rateLimiters.get(cacheKey)!;

  const limiter = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
    analytics: true,
    prefix: `orlegit:rl:${key}`,
  });

  rateLimiters.set(cacheKey, limiter);
  return limiter;
}

/**
 * Check rate limit using Redis (production) or in-memory (development fallback).
 *
 * @param identifier - Unique key for this limiter (e.g. "analyze:user:uuid" or "lookup:ip:1.2.3.4")
 * @param config - maxRequests and windowMs
 */
export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // In development without Upstash configured, fall back to in-memory
  if (!isRedisConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[rateLimit] Upstash Redis is not configured in production! " +
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. " +
        "Falling back to in-memory (NOT safe for multi-instance deployments)."
      );
    }
    return checkRateLimit(identifier, config);
  }

  try {
    const limiter = getRateLimiter(identifier, config);
    const { success, remaining, reset } = await limiter.limit(identifier);

    return {
      allowed: success,
      remaining,
      retryAfterMs: success ? null : Math.max(0, reset - Date.now()),
    };
  } catch (err) {
    console.error("[rateLimit] Redis error, falling back to in-memory:", err);
    return checkRateLimit(identifier, config);
  }
}

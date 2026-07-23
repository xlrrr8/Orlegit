/**
 * Upstash Redis client singleton.
 *
 * Setup:
 *   1. Create a free Redis database at https://console.upstash.com/
 *   2. Copy REST URL and token into .env.local:
 *        UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
 *        UPSTASH_REDIS_REST_TOKEN=your_token_here
 *
 * This is a lazy singleton — the client is only instantiated on first use,
 * which avoids errors during Next.js build-time static generation.
 */

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token || url === "https://your-db.upstash.io") {
    throw new Error(
      "[redis] Missing Upstash credentials. Set UPSTASH_REDIS_REST_URL and " +
      "UPSTASH_REDIS_REST_TOKEN in .env.local. Get them from https://console.upstash.com/"
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Returns true if Upstash Redis is configured (env vars are set and non-placeholder).
 * Used to gracefully fall back to in-memory limiting when Redis isn't configured yet.
 */
export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return (
    Boolean(url) &&
    Boolean(token) &&
    url !== "https://your-db.upstash.io" &&
    token !== "your_token_here"
  );
}

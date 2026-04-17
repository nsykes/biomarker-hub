import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/** Upstash Redis singleton. Returns null if credentials aren't configured
 *  (allowed in dev; blocked in prod by `env.ts`). */
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** Build a sliding-window limiter, or a no-op pass-through if Redis is unset
 *  (dev-only). The no-op still returns the same shape so callers never branch. */
function makeLimiter(requests: number, windowSec: number, prefix: string) {
  if (!redis) {
    return {
      async limit() {
        const now = Date.now();
        return {
          success: true,
          limit: requests,
          remaining: requests,
          reset: now + windowSec * 1000,
        };
      },
    };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSec} s`),
    analytics: false,
    prefix: `bh:${prefix}`,
  });
}

/** Named limiters. Keyed by the natural identifier (IP, userId, token, API key).
 *  Windows are tuned to block automated abuse while leaving manual use unaffected. */
export const ratelimiters = {
  /** OAuth token exchange, keyed by IP. */
  oauthToken: makeLimiter(10, 60, "oauth:token"),
  /** OAuth authorization code generation, keyed by userId. */
  oauthAuthorize: makeLimiter(20, 60, "oauth:authz"),
  /** PDF extraction (expensive LLM call), keyed by userId. */
  extraction: makeLimiter(5, 60, "extract"),
  /** Doctor-share password validation, keyed by share token (brute-force surface). */
  doctorShareValidate: makeLimiter(20, 60, "share:validate"),
  /** External v1 API, keyed by API key id. */
  apiV1: makeLimiter(60, 60, "v1"),
  /** MCP tool calls, keyed by userId. */
  mcpTool: makeLimiter(60, 60, "mcp"),
  /** Session-authed routes that are cheap per call but expensive if looped
   *  (PDF download, CSV export). Keyed by userId. */
  sessionApi: makeLimiter(30, 60, "session"),
} as const;

export type RateLimiterName = keyof typeof ratelimiters;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/** Check a limiter. Returns the result; callers translate to 429 when not successful. */
export async function checkRateLimit(
  name: RateLimiterName,
  identifier: string
): Promise<RateLimitResult> {
  return ratelimiters[name].limit(identifier);
}

/** Headers to include in any rate-limited response (success or failure).
 *  `Retry-After` is included only on 429. */
export function rateLimitHeaders(
  result: RateLimitResult,
  rejected = false
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
  if (rejected) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    headers["Retry-After"] = String(retryAfter);
  }
  return headers;
}

/** Extract a client IP from a Request. Falls back to `unknown` so the limiter
 *  still has a bucket to hash (prevents bypass via missing header). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

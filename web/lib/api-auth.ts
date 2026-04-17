import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/db/actions/api-keys";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "@/lib/rate-limit";

/** Extract and validate `Authorization: Bearer bh_...`. Returns userId or null. */
export async function authenticateApiKey(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7).trim();
  if (!key.startsWith("bh_")) return null;

  return validateApiKey(key);
}

/** Consistent JSON response using the Next 16 Turbopack-safe pattern. */
function json(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export function unauthorized(): Response {
  return json({ error: "Invalid or missing API key" }, 401);
}

export function rateLimited(limit: RateLimitResult): Response {
  return json(
    { error: "Rate limit exceeded" },
    429,
    rateLimitHeaders(limit, true)
  );
}

/** Auth + rate-limit in one call. Returns `{ userId }` on success or a Response
 *  to be returned directly by the route. */
export async function authAndLimit(
  request: NextRequest
): Promise<{ userId: string } | Response> {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();
  const limit = await checkRateLimit("apiV1", userId);
  if (!limit.success) return rateLimited(limit);
  return { userId };
}

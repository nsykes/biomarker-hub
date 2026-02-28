import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/db/actions/api-keys";

/**
 * Extract and validate API key from request.
 * Supports: Authorization: Bearer bh_xxx
 * Returns userId or null.
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7).trim();
  if (!key.startsWith("bh_")) return null;

  return validateApiKey(key);
}

export function unauthorized() {
  return Response.json(
    { error: "Invalid or missing API key" },
    { status: 401 }
  );
}

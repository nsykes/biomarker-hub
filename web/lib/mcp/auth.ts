import crypto from "crypto";
import { db } from "@/lib/db";
import { oauthTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Validate an OAuth access token. Returns userId or null. */
export async function validateOAuthToken(
  token: string
): Promise<string | null> {
  const hash = hashToken(token);
  const rows = await db
    .select({ userId: oauthTokens.userId })
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.tokenHash, hash),
        gt(oauthTokens.expiresAt, new Date())
      )
    );

  if (rows.length === 0) return null;
  return rows[0].userId;
}

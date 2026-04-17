import crypto from "crypto";
import { db } from "@/lib/db";
import { oauthTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Validate an OAuth access token. Returns userId or null.
 *  Uses DB index for lookup, then constant-time hash comparison for
 *  defense-in-depth (consistent with the API key validation pattern). */
export async function validateOAuthToken(
  token: string
): Promise<string | null> {
  const hash = hashToken(token);
  const hashBuf = Buffer.from(hash, "hex");

  const rows = await db
    .select({ userId: oauthTokens.userId, tokenHash: oauthTokens.tokenHash })
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.tokenHash, hash),
        gt(oauthTokens.expiresAt, new Date())
      )
    );

  for (const row of rows) {
    const rowBuf = Buffer.from(row.tokenHash, "hex");
    if (
      hashBuf.length === rowBuf.length &&
      crypto.timingSafeEqual(hashBuf, rowBuf)
    ) {
      return row.userId;
    }
  }
  return null;
}

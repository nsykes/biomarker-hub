import crypto from "crypto";
import { db } from "@/lib/db";
import { oauthCodes, oauthTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

/** Build a JSON response using new Response() — Response.json() silently
 *  fails in Next.js 16 Turbopack route handlers. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const rawBody = await request.text();
    let params: URLSearchParams;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      params = new URLSearchParams(rawBody);
    } else {
      // Also accept JSON for flexibility
      try {
        const body = JSON.parse(rawBody);
        params = new URLSearchParams(body);
      } catch {
        return json({ error: "invalid_request", error_description: "Invalid request body" }, 400);
      }
    }

    const grantType = params.get("grant_type");
    if (grantType !== "authorization_code") {
      return json({ error: "unsupported_grant_type" }, 400);
    }

    const code = params.get("code");
    const redirectUri = params.get("redirect_uri");
    const clientId = params.get("client_id");
    const codeVerifier = params.get("code_verifier");

    if (!code || !clientId) {
      return json(
        { error: "invalid_request", error_description: "code and client_id are required" },
        400
      );
    }

    // Look up the authorization code
    const codeRows = await db
      .select()
      .from(oauthCodes)
      .where(eq(oauthCodes.code, code));

    if (codeRows.length === 0) {
      return json(
        { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
        400
      );
    }

    const authCode = codeRows[0];

    // Validate code hasn't expired
    if (new Date() > authCode.expiresAt) {
      await db.delete(oauthCodes).where(eq(oauthCodes.id, authCode.id));
      return json(
        { error: "invalid_grant", error_description: "Authorization code has expired" },
        400
      );
    }

    // Validate client_id matches
    if (authCode.clientId !== clientId) {
      return json(
        { error: "invalid_grant", error_description: "Client ID mismatch" },
        400
      );
    }

    // Validate redirect_uri matches (if provided)
    if (redirectUri && authCode.redirectUri !== redirectUri) {
      return json(
        { error: "invalid_grant", error_description: "Redirect URI mismatch" },
        400
      );
    }

    // PKCE verification
    if (authCode.codeChallenge) {
      if (!codeVerifier) {
        return json(
          { error: "invalid_grant", error_description: "code_verifier is required" },
          400
        );
      }

      const expectedChallenge = base64url(
        crypto.createHash("sha256").update(codeVerifier).digest()
      );

      if (expectedChallenge !== authCode.codeChallenge) {
        return json(
          { error: "invalid_grant", error_description: "PKCE verification failed" },
          400
        );
      }
    }

    // Delete the used authorization code (single-use)
    await db.delete(oauthCodes).where(eq(oauthCodes.id, authCode.id));

    // Generate access token
    const accessToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(accessToken)
      .digest("hex");

    const expiresIn = 3600; // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await db.insert(oauthTokens).values({
      tokenHash,
      userId: authCode.userId,
      clientId: authCode.clientId,
      expiresAt,
    });

    return json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
    });
  } catch (err) {
    console.error(`[token] ERROR: ${String(err)}`);
    return json({ error: "server_error", error_description: String(err) }, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

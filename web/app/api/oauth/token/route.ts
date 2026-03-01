import crypto from "crypto";
import { db } from "@/lib/db";
import { oauthCodes, oauthTokens, oauthClients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let params: URLSearchParams;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    params = new URLSearchParams(await request.text());
  } else {
    // Also accept JSON for flexibility
    const body = await request.json();
    params = new URLSearchParams(body);
  }

  const grantType = params.get("grant_type");
  if (grantType !== "authorization_code") {
    return Response.json(
      { error: "unsupported_grant_type" },
      { status: 400, headers: corsHeaders }
    );
  }

  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const clientId = params.get("client_id");
  const codeVerifier = params.get("code_verifier");

  if (!code || !clientId) {
    return Response.json(
      { error: "invalid_request", error_description: "code and client_id are required" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Look up the authorization code
  const codeRows = await db
    .select()
    .from(oauthCodes)
    .where(eq(oauthCodes.code, code));

  if (codeRows.length === 0) {
    return Response.json(
      { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
      { status: 400, headers: corsHeaders }
    );
  }

  const authCode = codeRows[0];

  // Validate code hasn't expired
  if (new Date() > authCode.expiresAt) {
    await db.delete(oauthCodes).where(eq(oauthCodes.id, authCode.id));
    return Response.json(
      { error: "invalid_grant", error_description: "Authorization code has expired" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate client_id matches
  if (authCode.clientId !== clientId) {
    return Response.json(
      { error: "invalid_grant", error_description: "Client ID mismatch" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate redirect_uri matches (if provided)
  if (redirectUri && authCode.redirectUri !== redirectUri) {
    return Response.json(
      { error: "invalid_grant", error_description: "Redirect URI mismatch" },
      { status: 400, headers: corsHeaders }
    );
  }

  // PKCE verification
  if (authCode.codeChallenge) {
    if (!codeVerifier) {
      return Response.json(
        { error: "invalid_grant", error_description: "code_verifier is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const expectedChallenge = base64url(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );

    if (expectedChallenge !== authCode.codeChallenge) {
      return Response.json(
        { error: "invalid_grant", error_description: "PKCE verification failed" },
        { status: 400, headers: corsHeaders }
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

  return Response.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

import crypto from "crypto";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { oauthClients, oauthCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Build a JSON response using new Response() — Response.json() silently
 *  fails in Next.js 16 Turbopack route handlers. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** GET: Validate the authorization request and return client info. */
export async function GET(request: NextRequest) {
  const session = await auth.getSession();
  if (!session?.data?.user) {
    return json({ error: "Not authenticated" }, 401);
  }

  const clientId = request.nextUrl.searchParams.get("client_id");
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri");

  if (!clientId || !redirectUri) {
    return json({ error: "client_id and redirect_uri are required" }, 400);
  }

  // Look up the registered client
  const clients = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId));

  if (clients.length === 0) {
    return json({ error: "Unknown client" }, 400);
  }

  const client = clients[0];

  // Validate redirect_uri
  if (!client.redirectUris.includes(redirectUri)) {
    return json({ error: "Invalid redirect_uri" }, 400);
  }

  return json({ client_name: client.clientName });
}

/** POST: Generate an authorization code and return the redirect URL. */
export async function POST(request: Request) {
  try {
    const session = await auth.getSession();
    if (!session?.data?.user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const rawBody = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "invalid_request", error_description: "Invalid JSON body" }, 400);
    }

    const { client_id, redirect_uri, state, code_challenge, code_challenge_method } = body;

    if (!client_id || !redirect_uri) {
      return json({ error: "client_id and redirect_uri are required" }, 400);
    }

    // Validate client
    const clients = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, client_id as string));

    if (clients.length === 0) {
      return json({ error: "Unknown client" }, 400);
    }

    const client = clients[0];
    if (!client.redirectUris.includes(redirect_uri as string)) {
      return json({ error: "Invalid redirect_uri" }, 400);
    }

    // Generate authorization code
    const code = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(oauthCodes).values({
      code,
      clientId: client_id as string,
      userId: session.data.user.id,
      redirectUri: redirect_uri as string,
      codeChallenge: (code_challenge as string) ?? null,
      codeChallengeMethod: (code_challenge_method as string) ?? null,
      expiresAt,
    });

    // Build redirect URL
    const url = new URL(redirect_uri as string);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state as string);

    return json({ redirect_to: url.toString() });
  } catch (err) {
    console.error(`[authorize] ERROR: ${String(err)}`);
    return json({ error: "server_error", error_description: String(err) }, 500);
  }
}

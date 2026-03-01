import crypto from "crypto";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { oauthClients, oauthCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** GET: Validate the authorization request and return client info. */
export async function GET(request: NextRequest) {
  const session = await auth.getSession();
  if (!session?.data?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clientId = request.nextUrl.searchParams.get("client_id");
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri");

  if (!clientId || !redirectUri) {
    return Response.json(
      { error: "client_id and redirect_uri are required" },
      { status: 400 }
    );
  }

  // Look up the registered client
  const clients = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId));

  if (clients.length === 0) {
    return Response.json({ error: "Unknown client" }, { status: 400 });
  }

  const client = clients[0];

  // Validate redirect_uri
  if (!client.redirectUris.includes(redirectUri)) {
    return Response.json({ error: "Invalid redirect_uri" }, { status: 400 });
  }

  return Response.json({ client_name: client.clientName });
}

/** POST: Generate an authorization code and return the redirect URL. */
export async function POST(request: Request) {
  const session = await auth.getSession();
  if (!session?.data?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { client_id, redirect_uri, state, code_challenge, code_challenge_method } = body;

  if (!client_id || !redirect_uri) {
    return Response.json(
      { error: "client_id and redirect_uri are required" },
      { status: 400 }
    );
  }

  // Validate client
  const clients = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, client_id));

  if (clients.length === 0) {
    return Response.json({ error: "Unknown client" }, { status: 400 });
  }

  const client = clients[0];
  if (!client.redirectUris.includes(redirect_uri)) {
    return Response.json({ error: "Invalid redirect_uri" }, { status: 400 });
  }

  // Generate authorization code
  const code = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(oauthCodes).values({
    code,
    clientId: client_id,
    userId: session.data.user.id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge ?? null,
    codeChallengeMethod: code_challenge_method ?? null,
    expiresAt,
  });

  // Build redirect URL
  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);

  return Response.json({ redirect_to: url.toString() });
}

import crypto from "crypto";
import { db } from "@/lib/db";
import { oauthClients } from "@/lib/db/schema";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request: Request) {
  const body = await request.json();
  const { client_name, redirect_uris } = body;

  if (!client_name || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return Response.json(
      { error: "client_name and redirect_uris are required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const clientId = crypto.randomBytes(16).toString("hex");
  const clientSecret = crypto.randomBytes(32).toString("hex");
  const clientSecretHash = crypto
    .createHash("sha256")
    .update(clientSecret)
    .digest("hex");

  try {
    await db.insert(oauthClients).values({
      clientId,
      clientSecretHash,
      clientName: client_name,
      // Neon HTTP driver can't serialize JS objects for jsonb params —
      // pre-stringify so the driver sends a plain text parameter that
      // PostgreSQL can cast to jsonb.
      redirectUris: JSON.stringify(redirect_uris) as unknown as string[],
    });
  } catch (err) {
    console.error("DCR insert failed:", err);
    return Response.json(
      { error: "server_error", error_description: String(err) },
      { status: 500, headers: corsHeaders }
    );
  }

  return Response.json(
    {
      client_id: clientId,
      client_secret: clientSecret,
      client_name,
      redirect_uris,
    },
    { status: 201, headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

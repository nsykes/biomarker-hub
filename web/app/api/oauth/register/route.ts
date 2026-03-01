import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
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
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO oauth_clients (client_id, client_secret_hash, client_name, redirect_uris)
      VALUES (${clientId}, ${clientSecretHash}, ${client_name}, ${JSON.stringify(redirect_uris)}::jsonb)
    `;
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.error("DCR insert failed:", JSON.stringify({
      message: e.message, code: e.code, detail: e.detail, hint: e.hint,
    }));
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

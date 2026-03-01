import crypto from "crypto";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

console.log("[register] module loaded, version=v3, time=" + Date.now());

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request: Request) {
  console.log("[register] POST called", {
    contentType: request.headers.get("content-type"),
    userAgent: request.headers.get("user-agent"),
    method: request.method,
  });

  try {
    // Parse body — handle both JSON and form-encoded
    let body: Record<string, unknown>;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(await request.text());
      body = Object.fromEntries(params);
      // redirect_uris may be a JSON string in form-encoded
      if (typeof body.redirect_uris === "string") {
        try {
          body.redirect_uris = JSON.parse(body.redirect_uris as string);
        } catch {
          // leave as-is, validation below will catch it
        }
      }
    } else {
      body = await request.json();
    }

    const { client_name, redirect_uris } = body;

    if (
      !client_name ||
      !Array.isArray(redirect_uris) ||
      redirect_uris.length === 0
    ) {
      return NextResponse.json(
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

    // Raw neon() SQL — Drizzle + neon-http can't serialize jsonb params
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO oauth_clients (client_id, client_secret_hash, client_name, redirect_uris)
      VALUES (${clientId}, ${clientSecretHash}, ${client_name as string}, ${JSON.stringify(redirect_uris)}::jsonb)
    `;

    return NextResponse.json(
      {
        client_id: clientId,
        client_secret: clientSecret,
        client_name,
        redirect_uris,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[register] DCR error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

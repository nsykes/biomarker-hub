import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

/** Build a JSON response using new Response() — NextResponse.json() and
 *  Response.json() silently fail in this route under Next.js 16 Turbopack. */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const rawBody = await request.text();
    let body: Record<string, unknown>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      body = Object.fromEntries(params);
      if (typeof body.redirect_uris === "string") {
        try {
          body.redirect_uris = JSON.parse(body.redirect_uris as string);
        } catch {
          // leave as-is, validation below will catch it
        }
      }
    } else {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return json({ error: "invalid_request", error_description: "Invalid JSON body" }, 400);
      }
    }

    const { client_name, redirect_uris } = body;

    if (
      !client_name ||
      !Array.isArray(redirect_uris) ||
      redirect_uris.length === 0
    ) {
      return json({ error: "client_name and redirect_uris are required" }, 400);
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

    return json(
      { client_id: clientId, client_secret: clientSecret, client_name, redirect_uris },
      201
    );
  } catch (err) {
    console.error(`[register] ERROR: ${String(err)}`);
    return json({ error: "server_error", error_description: String(err) }, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

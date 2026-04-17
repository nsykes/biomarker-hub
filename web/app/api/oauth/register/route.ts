import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Build a JSON response using new Response() — NextResponse.json() and
 *  Response.json() silently fail in this route under Next.js 16 Turbopack. */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** DCR (RFC 7591) payload. Enforced at the boundary — clients that miss
 *  required fields or submit malformed URIs are rejected with 400. */
const registerSchema = z.object({
  client_name: z.string().min(1).max(200),
  redirect_uris: z.array(z.string().url()).min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const rawBody = await request.text();
    let body: unknown;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      const obj: Record<string, unknown> = Object.fromEntries(params);
      if (typeof obj.redirect_uris === "string") {
        try {
          obj.redirect_uris = JSON.parse(obj.redirect_uris);
        } catch {
          // leave as-is; schema validation below will reject
        }
      }
      body = obj;
    } else {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return json(
          { error: "invalid_request", error_description: "Invalid JSON body" },
          400
        );
      }
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          error: "invalid_request",
          error_description: "client_name and redirect_uris are required",
        },
        400
      );
    }
    const { client_name, redirect_uris } = parsed.data;

    const clientId = crypto.randomBytes(16).toString("hex");
    const clientSecret = crypto.randomBytes(32).toString("hex");
    const clientSecretHash = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");

    // Raw neon() SQL — Drizzle + neon-http can't serialize jsonb params
    const sql = neon(env.DATABASE_URL);
    await sql`
      INSERT INTO oauth_clients (client_id, client_secret_hash, client_name, redirect_uris)
      VALUES (${clientId}, ${clientSecretHash}, ${client_name}, ${JSON.stringify(redirect_uris)}::jsonb)
    `;

    return json(
      {
        client_id: clientId,
        client_secret: clientSecret,
        client_name,
        redirect_uris,
      },
      201
    );
  } catch (err) {
    log.error("oauth.register.failed", err);
    return json(
      { error: "server_error", error_description: "internal_server_error" },
      500
    );
  }
}

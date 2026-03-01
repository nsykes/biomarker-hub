import { getAppUrl } from "@/lib/mcp/url";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "public, max-age=3600",
};

export async function GET() {
  const issuer = getAppUrl();
  return Response.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      registration_endpoint: `${issuer}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

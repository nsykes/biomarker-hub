import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerPrompts } from "@/lib/mcp/prompts";
import { validateOAuthToken } from "@/lib/mcp/auth";
import { validateApiKey } from "@/lib/db/actions/api-keys";
import { registerGetBiomarkers } from "@/lib/mcp/tools/get-biomarkers";
import { registerListReports } from "@/lib/mcp/tools/list-reports";
import { registerSearchRegistry } from "@/lib/mcp/tools/search-registry";

const handler = createMcpHandler(
  (server) => {
    registerGetBiomarkers(server);
    registerListReports(server);
    registerSearchRegistry(server);
    registerPrompts(server);
  },
  {
    serverInfo: { name: "biomarker-hub", version: "0.1.0" },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
  }
);

// Wrap with auth: OAuth tokens + API key fallback
const authHandler = withMcpAuth(
  handler,
  async (
    _req: Request,
    bearerToken?: string
  ): Promise<AuthInfo | undefined> => {
    if (!bearerToken) return undefined;

    let userId = await validateOAuthToken(bearerToken);
    if (!userId && bearerToken.startsWith("bh_")) {
      userId = await validateApiKey(bearerToken);
    }
    if (!userId) return undefined;

    return {
      token: bearerToken,
      clientId: "biomarker-hub",
      scopes: [],
      extra: { userId },
    };
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
  }
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };

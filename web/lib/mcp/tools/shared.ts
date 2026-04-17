import { checkRateLimit } from "@/lib/rate-limit";

type TextContent = { type: "text"; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

/** Shared tool-level rate limit. Returns a ToolResult to return directly
 *  on 429, or null to continue. */
export async function gateByUser(userId: string): Promise<ToolResult | null> {
  const limit = await checkRateLimit("mcpTool", userId);
  if (limit.success) return null;
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: "Rate limit exceeded. Please wait and try again.",
      },
    ],
  };
}

/** Extract userId from the MCP authInfo object. The `withMcpAuth` wrapper
 *  guarantees this is set on every tool invocation. */
export function userIdFrom(authInfo: unknown): string {
  const info = authInfo as { extra?: { userId?: string } };
  return info?.extra?.userId ?? "";
}

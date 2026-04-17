import { z } from "zod";
import { REGISTRY } from "@/lib/biomarker-registry";
import { gateByUser, userIdFrom } from "./shared";

type McpServer = Parameters<
  Parameters<typeof import("mcp-handler").createMcpHandler>[0]
>[0];

const description =
  "Search the reference database of 198 recognized biomarkers by name, abbreviation, or category. Returns clinical definitions and slugs. This is reference data, not user data. Use this to find the correct slug when the user refers to a biomarker by name, then call get-biomarkers with those slugs.";

export function registerSearchRegistry(server: McpServer): void {
  server.tool(
    "search-registry",
    description,
    {
      query: z
        .string()
        .describe("Biomarker name, abbreviation, or category to search"),
    },
    async ({ query }, { authInfo }) => {
      const userId = userIdFrom(authInfo);
      const gated = await gateByUser(userId);
      if (gated) return gated;

      const q = query.toLowerCase();
      const filtered = REGISTRY.filter(
        (e) =>
          e.slug.includes(q) ||
          e.displayName.toLowerCase().includes(q) ||
          e.fullName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q)) ||
          (e.summary?.toLowerCase().includes(q) ?? false)
      );

      if (filtered.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No biomarkers found matching "${query}". Try a different name or abbreviation.`,
            },
          ],
        };
      }

      const entries = filtered.map((e) => ({
        slug: e.slug,
        displayName: e.displayName,
        fullName: e.fullName,
        category: e.category,
        defaultUnit: e.defaultUnit,
        summary: e.summary ?? null,
        specimenType: e.specimenType,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(entries, null, 2),
          },
        ],
      };
    }
  );
}

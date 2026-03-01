import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BiomarkerHubClient } from "../client.js";

export function registerRegistryTools(
  server: McpServer,
  client: BiomarkerHubClient
) {
  server.tool(
    "search-registry",
    "Search the reference database of all 198 recognized biomarkers by name, abbreviation, or category. Returns clinical definitions with slugs, display names, categories, units, and summaries. This is NOT the user's data — it's a reference lookup. Use this to find the correct slug when the user refers to a biomarker by name (e.g., 'vitamin D' → slug 'vitamin-d-25-hydroxy'), or to get clinical context about what a biomarker measures. Then use get-biomarkers with the slug to fetch the user's actual data.",
    {
      query: z
        .string()
        .describe(
          "Search term: biomarker name, abbreviation, or category (e.g., 'cholesterol', 'thyroid', 'A1C')"
        ),
    },
    async ({ query }) => {
      const { registry } = await client.getRegistry(query);

      return {
        content: [
          {
            type: "text" as const,
            text:
              registry.length > 0
                ? JSON.stringify(registry, null, 2)
                : `No biomarkers found matching "${query}". Try a different term or check available categories.`,
          },
        ],
      };
    }
  );
}

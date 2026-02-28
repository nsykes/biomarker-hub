import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BiomarkerHubClient } from "../client.js";

export function registerRegistryTools(
  server: McpServer,
  client: BiomarkerHubClient
) {
  server.tool(
    "search-registry",
    "Search the canonical biomarker registry by name, category, or keyword. Returns biomarker definitions with slugs, display names, categories, units, and clinical summaries. Use this to find the correct slug for a biomarker, or to get clinical context about what a biomarker measures.",
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

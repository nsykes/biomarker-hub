import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BiomarkerHubClient } from "../client.js";

export function registerBiomarkerTools(
  server: McpServer,
  client: BiomarkerHubClient
) {
  server.tool(
    "list-biomarkers",
    "List all biomarkers the user has data for, with display name, category, and unit. Use this to discover what biomarkers are available before querying specific ones.",
    {
      category: z
        .string()
        .optional()
        .describe(
          "Optional: filter by category (e.g., 'Heart', 'Metabolic', 'Thyroid')"
        ),
    },
    async ({ category }) => {
      const { biomarkers } = await client.listBiomarkers(category);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(biomarkers, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get-biomarker-detail",
    "Get complete history, reference range, trend, and clinical summary for a specific biomarker. Returns all data points with dates, values, units, flags, and source lab information. The trend shows direction (up/down/flat) and sentiment (good/bad/neutral) based on goal direction.",
    {
      slug: z
        .string()
        .describe(
          "The canonical slug of the biomarker (e.g., 'glucose', 'hdl-cholesterol', 'tsh'). Use list-biomarkers first to find available slugs."
        ),
    },
    async ({ slug }) => {
      const data = await client.getBiomarkerDetail(slug);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get-biomarker-batch",
    "Fetch history, reference ranges, and trends for multiple biomarkers in a single call. More efficient than calling get-biomarker-detail multiple times. Ideal for panel analysis (e.g., all lipid markers, all thyroid markers).",
    {
      slugs: z
        .array(z.string())
        .describe(
          "Array of biomarker slugs to fetch (e.g., ['glucose', 'hemoglobin-a1c', 'insulin'])"
        ),
    },
    async ({ slugs }) => {
      const data = await client.getBiomarkerBatch(slugs);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}

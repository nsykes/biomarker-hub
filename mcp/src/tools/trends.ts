import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BiomarkerHubClient } from "../client.js";

export function registerTrendTools(
  server: McpServer,
  client: BiomarkerHubClient
) {
  server.tool(
    "get-health-summary",
    "Get a structured summary of all tracked biomarkers with their latest values, trends, and flags. Groups results by category. Highlights any out-of-range values and concerning trends. This is the best starting point for a comprehensive health overview.",
    {},
    async () => {
      const { biomarkers } = await client.listBiomarkers();
      if (biomarkers.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No biomarker data found. Upload a lab report PDF first.",
            },
          ],
        };
      }

      // Batch fetch all biomarkers (in chunks of 50 to avoid URL length limits)
      const allSlugs = biomarkers.map((b) => b.slug);
      const chunks: string[][] = [];
      for (let i = 0; i < allSlugs.length; i += 50) {
        chunks.push(allSlugs.slice(i, i + 50));
      }

      const allData: unknown[] = [];
      for (const chunk of chunks) {
        const { biomarkers: batch } = await client.getBiomarkerBatch(chunk);
        allData.push(...batch);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(allData, null, 2),
          },
        ],
      };
    }
  );
}

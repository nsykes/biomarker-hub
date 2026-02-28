import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BiomarkerHubClient } from "../client.js";

export function registerResources(
  server: McpServer,
  client: BiomarkerHubClient
) {
  server.resource(
    "biomarker-registry",
    "biomarker-hub://registry",
    {
      description:
        "Complete list of 181+ recognized biomarkers with slugs, names, categories, units, and clinical summaries. Reference this to understand biomarker identifiers and clinical context.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            (await client.getRegistry()).registry,
            null,
            2
          ),
        },
      ],
    })
  );

  server.resource(
    "reference-ranges",
    "biomarker-hub://reference-ranges",
    {
      description:
        "All stored reference ranges with low/high bounds, units, and goal direction (below/above/within). These are the thresholds used to flag biomarker values as normal, high, or low.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            (await client.getReferenceRanges()).ranges,
            null,
            2
          ),
        },
      ],
    })
  );
}

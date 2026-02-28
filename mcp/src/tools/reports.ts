import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BiomarkerHubClient } from "../client.js";

export function registerReportTools(
  server: McpServer,
  client: BiomarkerHubClient
) {
  server.tool(
    "list-reports",
    "List all uploaded lab reports with collection dates, sources, lab names, and biomarker counts. Does NOT include PDF data. Use this to understand what reports exist and their timeline.",
    {},
    async () => {
      const data = await client.listReports();
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

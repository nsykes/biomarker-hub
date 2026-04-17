import { db } from "@/lib/db";
import { reports, biomarkerResults } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { gateByUser, userIdFrom } from "./shared";

type McpServer = Parameters<
  Parameters<typeof import("mcp-handler").createMcpHandler>[0]
>[0];

const description =
  "List all uploaded lab reports with collection dates, sources, lab names, and biomarker counts. Does NOT include PDF data.";

export function registerListReports(server: McpServer): void {
  server.tool("list-reports", description, {}, async (_, { authInfo }) => {
    const userId = userIdFrom(authInfo);
    const gated = await gateByUser(userId);
    if (gated) return gated;

    const rows = await db
      .select({
        id: reports.id,
        filename: reports.filename,
        source: reports.source,
        labName: reports.labName,
        collectionDate: reports.collectionDate,
        reportType: reports.reportType,
        addedAt: reports.addedAt,
        biomarkerCount: sql<number>`count(${biomarkerResults.id})::int`,
      })
      .from(reports)
      .leftJoin(biomarkerResults, eq(biomarkerResults.reportId, reports.id))
      .where(eq(reports.userId, userId))
      .groupBy(reports.id)
      .orderBy(desc(reports.collectionDate));

    const result = rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      source: r.source,
      labName: r.labName,
      collectionDate: r.collectionDate,
      reportType: r.reportType,
      addedAt: r.addedAt.toISOString(),
      biomarkerCount: r.biomarkerCount,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });
}

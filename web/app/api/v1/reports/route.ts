import { NextRequest } from "next/server";
import { authenticateApiKey, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { reports, biomarkerResults } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();

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

  return Response.json({ reports: result });
}

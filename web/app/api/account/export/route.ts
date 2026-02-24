import { db } from "@/lib/db";
import { reports, biomarkerResults } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth/server";

function csvEscape(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select({
      collectionDate: reports.collectionDate,
      category: biomarkerResults.category,
      metricName: biomarkerResults.metricName,
      value: biomarkerResults.value,
      valueText: biomarkerResults.valueText,
      unit: biomarkerResults.unit,
      flag: biomarkerResults.flag,
      referenceRangeLow: biomarkerResults.referenceRangeLow,
      referenceRangeHigh: biomarkerResults.referenceRangeHigh,
      filename: reports.filename,
      labName: reports.labName,
    })
    .from(biomarkerResults)
    .innerJoin(reports, eq(biomarkerResults.reportId, reports.id))
    .where(eq(reports.userId, session.user.id))
    .orderBy(asc(reports.collectionDate), asc(biomarkerResults.category));

  const header = "Date,Biomarker,Value,Unit,Flag,Reference Range Low,Reference Range High,Source File,Lab Name";
  const lines = [header];

  for (const r of rows) {
    const displayValue = r.value ?? r.valueText;
    lines.push(
      [
        csvEscape(r.collectionDate),
        csvEscape(r.metricName),
        csvEscape(displayValue),
        csvEscape(r.unit),
        csvEscape(r.flag),
        csvEscape(r.referenceRangeLow),
        csvEscape(r.referenceRangeHigh),
        csvEscape(r.filename),
        csvEscape(r.labName),
      ].join(",")
    );
  }

  const csv = lines.join("\r\n") + "\r\n";
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="biomarker-export-${date}.csv"`,
    },
  });
}

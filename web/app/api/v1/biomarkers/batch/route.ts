import { NextRequest } from "next/server";
import { authAndLimit } from "@/lib/api-auth";
import { getBatchChartDataByUser } from "@/lib/db/queries/biomarkers";
import { computeTrend } from "@/lib/trend";
import { jsonResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await authAndLimit(request);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const slugsParam = request.nextUrl.searchParams.get("slugs");
  if (!slugsParam) {
    return jsonResponse(
      { error: "Missing required query parameter: slugs" },
      { status: 400 }
    );
  }

  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return jsonResponse({ error: "No valid slugs provided" }, { status: 400 });
  }

  const reportId = request.nextUrl.searchParams.get("report_id") ?? undefined;
  const data = await getBatchChartDataByUser(userId, slugs, reportId);

  const biomarkers = data.map((d) => ({
    ...d,
    trend: computeTrend(d.slug, d.history, d.referenceRange),
  }));

  return jsonResponse({ biomarkers });
}

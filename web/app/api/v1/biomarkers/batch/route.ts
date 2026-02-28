import { NextRequest } from "next/server";
import { authenticateApiKey, unauthorized } from "@/lib/api-auth";
import { getBatchChartDataByUser } from "@/lib/db/queries/biomarkers";
import { computeTrend } from "@/lib/trend";

export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();

  const slugsParam = request.nextUrl.searchParams.get("slugs");
  if (!slugsParam) {
    return Response.json(
      { error: "Missing required query parameter: slugs" },
      { status: 400 }
    );
  }

  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return Response.json(
      { error: "No valid slugs provided" },
      { status: 400 }
    );
  }

  const data = await getBatchChartDataByUser(userId, slugs);

  const biomarkers = data.map((d) => ({
    ...d,
    trend: computeTrend(d.slug, d.history, d.referenceRange),
  }));

  return Response.json({ biomarkers });
}

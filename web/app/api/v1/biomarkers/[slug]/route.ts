import { NextRequest } from "next/server";
import { authAndLimit } from "@/lib/api-auth";
import { getBiomarkerHistoryByUser } from "@/lib/db/queries/biomarkers";
import { computeTrend } from "@/lib/trend";
import { REGISTRY } from "@/lib/biomarker-registry";
import { jsonResponse } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authAndLimit(request);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const { slug } = await params;
  const entry = REGISTRY.find((e) => e.slug === slug);
  const { history, referenceRange } = await getBiomarkerHistoryByUser(
    userId,
    slug
  );

  if (history.length === 0 && !entry) {
    return jsonResponse(
      { error: `No data found for biomarker "${slug}"` },
      { status: 404 }
    );
  }

  const trend = computeTrend(slug, history, referenceRange);

  return jsonResponse({
    slug,
    displayName: entry?.displayName ?? slug,
    fullName: entry?.fullName ?? slug,
    category: entry?.category ?? "Unknown",
    defaultUnit: entry?.defaultUnit ?? null,
    summary: entry?.summary ?? null,
    history,
    referenceRange,
    trend,
  });
}

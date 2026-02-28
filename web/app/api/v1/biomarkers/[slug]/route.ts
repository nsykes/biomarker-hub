import { NextRequest } from "next/server";
import { authenticateApiKey, unauthorized } from "@/lib/api-auth";
import { getBiomarkerHistoryByUser } from "@/lib/db/queries/biomarkers";
import { computeTrend } from "@/lib/trend";
import { REGISTRY } from "@/lib/biomarker-registry";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();

  const { slug } = await params;
  const entry = REGISTRY.find((e) => e.slug === slug);
  const { history, referenceRange } = await getBiomarkerHistoryByUser(
    userId,
    slug
  );

  if (history.length === 0 && !entry) {
    return Response.json(
      { error: `No data found for biomarker "${slug}"` },
      { status: 404 }
    );
  }

  const trend = computeTrend(slug, history, referenceRange);

  return Response.json({
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

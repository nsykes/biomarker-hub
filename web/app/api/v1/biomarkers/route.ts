import { NextRequest } from "next/server";
import { authenticateApiKey, unauthorized } from "@/lib/api-auth";
import {
  getUserBiomarkerSlugs,
  getBiomarkerSlugsByReport,
} from "@/lib/db/queries/biomarkers";
import { REGISTRY } from "@/lib/biomarker-registry";

export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();

  const reportId = request.nextUrl.searchParams.get("report_id");
  const slugs = reportId
    ? await getBiomarkerSlugsByReport(userId, reportId)
    : await getUserBiomarkerSlugs(userId);

  const category = request.nextUrl.searchParams.get("category");

  const biomarkers = slugs
    .map((slug) => {
      const entry = REGISTRY.find((e) => e.slug === slug);
      return {
        slug,
        displayName: entry?.displayName ?? slug,
        fullName: entry?.fullName ?? slug,
        category: entry?.category ?? "Unknown",
        defaultUnit: entry?.defaultUnit ?? null,
      };
    })
    .filter(
      (b) =>
        !category ||
        b.category.toLowerCase() === category.toLowerCase()
    );

  return Response.json({ biomarkers });
}

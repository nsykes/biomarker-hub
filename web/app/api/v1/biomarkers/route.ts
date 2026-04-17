import { NextRequest } from "next/server";
import { authAndLimit } from "@/lib/api-auth";
import {
  getUserBiomarkerSlugs,
  getBiomarkerSlugsByReport,
} from "@/lib/db/queries/biomarkers";
import { REGISTRY } from "@/lib/biomarker-registry";
import { jsonResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await authAndLimit(request);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

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

  return jsonResponse({ biomarkers });
}

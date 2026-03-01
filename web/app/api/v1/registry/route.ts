import { NextRequest } from "next/server";
import { REGISTRY } from "@/lib/biomarker-registry";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const category = request.nextUrl.searchParams.get("category");

  let filtered = [...REGISTRY];

  if (category) {
    filtered = filtered.filter(
      (e) => e.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.slug.includes(q) ||
        e.displayName.toLowerCase().includes(q) ||
        e.fullName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.aliases.some((a) => a.toLowerCase().includes(q)) ||
        (e.summary?.toLowerCase().includes(q) ?? false)
    );
  }

  const entries = filtered.map((e) => ({
    slug: e.slug,
    displayName: e.displayName,
    fullName: e.fullName,
    category: e.category,
    defaultUnit: e.defaultUnit,
    summary: e.summary ?? null,
    specimenType: e.specimenType,
  }));

  return Response.json({ registry: entries });
}

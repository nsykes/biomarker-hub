import { NextRequest } from "next/server";
import { REGISTRY } from "@/lib/biomarker-registry";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const category = request.nextUrl.searchParams.get("category");

  let entries = REGISTRY.map((e) => ({
    slug: e.slug,
    displayName: e.displayName,
    fullName: e.fullName,
    category: e.category,
    defaultUnit: e.defaultUnit,
    summary: e.summary ?? null,
    specimenType: e.specimenType,
  }));

  if (category) {
    entries = entries.filter(
      (e) => e.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.slug.includes(q) ||
        e.displayName.toLowerCase().includes(q) ||
        e.fullName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }

  return Response.json({ registry: entries });
}

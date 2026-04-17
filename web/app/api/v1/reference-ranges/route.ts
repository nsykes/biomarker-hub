import { NextRequest } from "next/server";
import { authAndLimit } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { referenceRanges } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await authAndLimit(request);
  if (auth instanceof Response) return auth;

  const rows = await db.select().from(referenceRanges);

  const ranges = rows.map((r) => ({
    slug: r.canonicalSlug,
    rangeLow: r.rangeLow !== null ? Number(r.rangeLow) : null,
    rangeHigh: r.rangeHigh !== null ? Number(r.rangeHigh) : null,
    goalDirection: r.goalDirection,
    unit: r.unit,
  }));

  return jsonResponse({ ranges });
}

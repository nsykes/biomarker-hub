import { NextRequest } from "next/server";
import { authenticateApiKey, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { referenceRanges } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) return unauthorized();

  const rows = await db.select().from(referenceRanges);

  const ranges = rows.map((r) => ({
    slug: r.canonicalSlug,
    rangeLow: r.rangeLow !== null ? Number(r.rangeLow) : null,
    rangeHigh: r.rangeHigh !== null ? Number(r.rangeHigh) : null,
    goalDirection: r.goalDirection,
    unit: r.unit,
  }));

  return Response.json({ ranges });
}

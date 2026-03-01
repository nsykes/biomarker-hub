"use server";

import { db } from "../index";
import { biomarkerResults, reports, referenceRanges } from "../schema";
import { eq, and, desc, isNotNull, or } from "drizzle-orm";
import {
  ReferenceRange,
  ReferenceRangeConflict,
} from "@/lib/types";
import { requireUser } from "./auth";
import { getBiomarkerHistoryByUser } from "../queries/biomarkers";
import { firstOrNull } from "../helpers";

/** Infer goal direction from one-sided or two-sided bounds. */
function inferGoalDirection(
  low: number | null,
  high: number | null
): "below" | "above" | "within" {
  if (low !== null && high !== null) return "within";
  if (high !== null) return "below";
  if (low !== null) return "above";
  return "within"; // fallback (shouldn't be reached if caller filters nulls)
}

export async function getReferenceRange(
  slug: string
): Promise<ReferenceRange | null> {
  const rows = await db
    .select()
    .from(referenceRanges)
    .where(eq(referenceRanges.canonicalSlug, slug));

  const r = firstOrNull(rows);
  if (!r) return null;
  return {
    rangeLow: r.rangeLow !== null ? Number(r.rangeLow) : null,
    rangeHigh: r.rangeHigh !== null ? Number(r.rangeHigh) : null,
    goalDirection: r.goalDirection,
    unit: r.unit,
  };
}

export async function getBiomarkerDetail(slug: string) {
  const userId = await requireUser();
  return getBiomarkerHistoryByUser(userId, slug);
}

export async function reconcileReferenceRanges(
  items: Array<{
    canonicalSlug: string;
    referenceRangeLow: number | null;
    referenceRangeHigh: number | null;
    unit: string | null;
    metricName: string;
  }>
): Promise<ReferenceRangeConflict[]> {
  const conflicts: ReferenceRangeConflict[] = [];

  for (const item of items) {
    if (!item.canonicalSlug) continue;
    if (item.referenceRangeLow === null && item.referenceRangeHigh === null) continue;

    const rows = await db
      .select()
      .from(referenceRanges)
      .where(eq(referenceRanges.canonicalSlug, item.canonicalSlug));

    if (rows.length === 0) {
      // No stored range — insert the PDF's range
      await db.insert(referenceRanges).values({
        canonicalSlug: item.canonicalSlug,
        rangeLow: item.referenceRangeLow !== null ? String(item.referenceRangeLow) : null,
        rangeHigh: item.referenceRangeHigh !== null ? String(item.referenceRangeHigh) : null,
        unit: item.unit,
        goalDirection: inferGoalDirection(item.referenceRangeLow, item.referenceRangeHigh),
      });
    } else {
      const stored = rows[0];
      const storedLow = stored.rangeLow !== null ? Number(stored.rangeLow) : null;
      const storedHigh = stored.rangeHigh !== null ? Number(stored.rangeHigh) : null;

      const rangesMatch =
        storedLow === item.referenceRangeLow &&
        storedHigh === item.referenceRangeHigh &&
        stored.unit === item.unit;

      if (!rangesMatch) {
        conflicts.push({
          slug: item.canonicalSlug,
          metricName: item.metricName,
          stored: { low: storedLow, high: storedHigh, unit: stored.unit },
          pdf: { low: item.referenceRangeLow, high: item.referenceRangeHigh, unit: item.unit },
        });
      }
    }
  }

  return conflicts;
}

export async function updateReferenceRange(
  slug: string,
  rangeLow: number | null,
  rangeHigh: number | null,
  unit: string | null
): Promise<void> {
  const rows = await db
    .select()
    .from(referenceRanges)
    .where(eq(referenceRanges.canonicalSlug, slug));

  if (rows.length === 0) {
    await db.insert(referenceRanges).values({
      canonicalSlug: slug,
      rangeLow: rangeLow !== null ? String(rangeLow) : null,
      rangeHigh: rangeHigh !== null ? String(rangeHigh) : null,
      unit,
      goalDirection: inferGoalDirection(rangeLow, rangeHigh),
    });
  } else {
    await db
      .update(referenceRanges)
      .set({
        rangeLow: rangeLow !== null ? String(rangeLow) : null,
        rangeHigh: rangeHigh !== null ? String(rangeHigh) : null,
        unit,
        goalDirection: inferGoalDirection(rangeLow, rangeHigh),
        updatedAt: new Date(),
      })
      .where(eq(referenceRanges.canonicalSlug, slug));
  }
}

/**
 * Backfill a global reference range from historical biomarker_results data.
 * Called on detail page load so pre-existing reports auto-seed the range.
 */
export async function backfillReferenceRange(
  slug: string
): Promise<ReferenceRange | null> {
  // Already has a global range — return it as-is
  const existing = await getReferenceRange(slug);
  if (existing) return existing;

  const userId = await requireUser();

  // Find the most recent result that has at least one range bound
  const rows = await db
    .select({
      referenceRangeLow: biomarkerResults.referenceRangeLow,
      referenceRangeHigh: biomarkerResults.referenceRangeHigh,
      unit: biomarkerResults.unit,
      collectionDate: reports.collectionDate,
      addedAt: reports.addedAt,
    })
    .from(biomarkerResults)
    .innerJoin(reports, eq(biomarkerResults.reportId, reports.id))
    .where(
      and(
        eq(biomarkerResults.canonicalSlug, slug),
        eq(reports.userId, userId),
        or(
          isNotNull(biomarkerResults.referenceRangeLow),
          isNotNull(biomarkerResults.referenceRangeHigh)
        )
      )
    )
    .orderBy(desc(reports.collectionDate), desc(reports.addedAt))
    .limit(1);

  const r = firstOrNull(rows);
  if (!r) return null;
  const low = r.referenceRangeLow !== null ? Number(r.referenceRangeLow) : null;
  const high = r.referenceRangeHigh !== null ? Number(r.referenceRangeHigh) : null;

  await db.insert(referenceRanges).values({
    canonicalSlug: slug,
    rangeLow: r.referenceRangeLow,
    rangeHigh: r.referenceRangeHigh,
    unit: r.unit,
    goalDirection: inferGoalDirection(low, high),
  });

  return {
    rangeLow: low,
    rangeHigh: high,
    goalDirection: inferGoalDirection(low, high),
    unit: r.unit,
  };
}

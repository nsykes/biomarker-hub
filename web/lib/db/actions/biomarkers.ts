"use server";

import { db } from "../index";
import { biomarkerResults, reports, referenceRanges } from "../schema";
import { eq, asc, and } from "drizzle-orm";
import {
  BiomarkerHistoryPoint,
  ReferenceRange,
  ReferenceRangeConflict,
} from "@/lib/types";
import { requireUser } from "./auth";

export async function getReferenceRange(
  slug: string
): Promise<ReferenceRange | null> {
  const rows = await db
    .select()
    .from(referenceRanges)
    .where(eq(referenceRanges.canonicalSlug, slug));

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    rangeLow: r.rangeLow !== null ? Number(r.rangeLow) : null,
    rangeHigh: r.rangeHigh !== null ? Number(r.rangeHigh) : null,
    goalDirection: r.goalDirection,
    unit: r.unit,
  };
}

export async function getBiomarkerDetail(
  slug: string
): Promise<{ history: BiomarkerHistoryPoint[]; referenceRange: ReferenceRange | null }> {
  const userId = await requireUser();

  const [historyRows, referenceRange] = await Promise.all([
    db
      .select({
        collectionDate: reports.collectionDate,
        value: biomarkerResults.value,
        valueText: biomarkerResults.valueText,
        valueModifier: biomarkerResults.valueModifier,
        unit: biomarkerResults.unit,
        flag: biomarkerResults.flag,
        reportId: biomarkerResults.reportId,
        filename: reports.filename,
        labName: reports.labName,
        referenceRangeLow: biomarkerResults.referenceRangeLow,
        referenceRangeHigh: biomarkerResults.referenceRangeHigh,
      })
      .from(biomarkerResults)
      .innerJoin(reports, eq(biomarkerResults.reportId, reports.id))
      .where(
        and(
          eq(biomarkerResults.canonicalSlug, slug),
          eq(reports.userId, userId)
        )
      )
      .orderBy(asc(reports.collectionDate)),
    getReferenceRange(slug),
  ]);

  const history: BiomarkerHistoryPoint[] = historyRows.map((r) => ({
    collectionDate: r.collectionDate,
    value: r.value !== null ? Number(r.value) : null,
    valueText: r.valueText,
    valueModifier: r.valueModifier,
    unit: r.unit,
    flag: r.flag,
    reportId: r.reportId,
    filename: r.filename,
    labName: r.labName,
    referenceRangeLow:
      r.referenceRangeLow !== null ? Number(r.referenceRangeLow) : null,
    referenceRangeHigh:
      r.referenceRangeHigh !== null ? Number(r.referenceRangeHigh) : null,
  }));

  return { history, referenceRange };
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
        goalDirection: "within",
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
      goalDirection: "within",
    });
  } else {
    await db
      .update(referenceRanges)
      .set({
        rangeLow: rangeLow !== null ? String(rangeLow) : null,
        rangeHigh: rangeHigh !== null ? String(rangeHigh) : null,
        unit,
        updatedAt: new Date(),
      })
      .where(eq(referenceRanges.canonicalSlug, slug));
  }
}

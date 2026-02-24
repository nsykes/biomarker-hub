"use server";

import { db } from "../index";
import { biomarkerResults, reports, referenceRanges } from "../schema";
import { eq, asc, and } from "drizzle-orm";
import {
  BiomarkerHistoryPoint,
  ReferenceRange,
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

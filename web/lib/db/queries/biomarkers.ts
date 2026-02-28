/**
 * Pure data-access functions that accept userId as a parameter (no session auth).
 * Used by both server actions (via requireUser()) and API routes (via API key auth).
 */

import { db } from "../index";
import {
  biomarkerResults,
  reports,
  referenceRanges,
} from "../schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import {
  BiomarkerHistoryPoint,
  BiomarkerDetailData,
  ReferenceRange,
} from "@/lib/types";
import { REGISTRY } from "@/lib/biomarker-registry";
import { getReferenceRange } from "../actions/biomarkers";

function toHistoryPoint(r: {
  collectionDate: string | null;
  value: string | null;
  valueText: string | null;
  valueModifier: "<" | ">" | null;
  unit: string | null;
  flag: string;
  reportId: string;
  filename: string;
  labName: string | null;
  source: string | null;
  referenceRangeLow: string | null;
  referenceRangeHigh: string | null;
  page: number | null;
  isCalculated: boolean;
}): BiomarkerHistoryPoint {
  return {
    collectionDate: r.collectionDate,
    value: r.value !== null ? Number(r.value) : null,
    valueText: r.valueText,
    valueModifier: r.valueModifier,
    unit: r.unit,
    flag: r.flag as BiomarkerHistoryPoint["flag"],
    reportId: r.reportId,
    filename: r.filename,
    labName: r.labName,
    source: r.source,
    referenceRangeLow:
      r.referenceRangeLow !== null ? Number(r.referenceRangeLow) : null,
    referenceRangeHigh:
      r.referenceRangeHigh !== null ? Number(r.referenceRangeHigh) : null,
    page: r.page,
    isCalculated: r.isCalculated,
  };
}

const historySelect = {
  collectionDate: reports.collectionDate,
  value: biomarkerResults.value,
  valueText: biomarkerResults.valueText,
  valueModifier: biomarkerResults.valueModifier,
  unit: biomarkerResults.unit,
  flag: biomarkerResults.flag,
  reportId: biomarkerResults.reportId,
  filename: reports.filename,
  labName: reports.labName,
  source: reports.source,
  referenceRangeLow: biomarkerResults.referenceRangeLow,
  referenceRangeHigh: biomarkerResults.referenceRangeHigh,
  page: biomarkerResults.page,
  isCalculated: biomarkerResults.isCalculated,
} as const;

export async function getBiomarkerHistoryByUser(
  userId: string,
  slug: string
): Promise<{
  history: BiomarkerHistoryPoint[];
  referenceRange: ReferenceRange | null;
}> {
  const [historyRows, referenceRange] = await Promise.all([
    db
      .select(historySelect)
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

  return {
    history: historyRows.map(toHistoryPoint),
    referenceRange,
  };
}

export async function getBatchChartDataByUser(
  userId: string,
  slugs: string[]
): Promise<BiomarkerDetailData[]> {
  if (slugs.length === 0) return [];

  const [historyRows, refRows] = await Promise.all([
    db
      .select({
        canonicalSlug: biomarkerResults.canonicalSlug,
        ...historySelect,
      })
      .from(biomarkerResults)
      .innerJoin(reports, eq(biomarkerResults.reportId, reports.id))
      .where(
        and(
          inArray(biomarkerResults.canonicalSlug, slugs),
          eq(reports.userId, userId)
        )
      )
      .orderBy(asc(reports.collectionDate)),
    db
      .select()
      .from(referenceRanges)
      .where(inArray(referenceRanges.canonicalSlug, slugs)),
  ]);

  const historyMap = new Map<string, BiomarkerHistoryPoint[]>();
  for (const r of historyRows) {
    const slug = r.canonicalSlug!;
    const points = historyMap.get(slug) || [];
    points.push(toHistoryPoint(r));
    historyMap.set(slug, points);
  }

  const refMap = new Map<string, ReferenceRange>();
  for (const r of refRows) {
    refMap.set(r.canonicalSlug, {
      rangeLow: r.rangeLow !== null ? Number(r.rangeLow) : null,
      rangeHigh: r.rangeHigh !== null ? Number(r.rangeHigh) : null,
      goalDirection: r.goalDirection,
      unit: r.unit,
    });
  }

  return slugs.map((slug) => {
    const entry = REGISTRY.find((e) => e.slug === slug);
    return {
      slug,
      displayName: entry?.displayName ?? slug,
      fullName: entry?.fullName ?? slug,
      category: entry?.category ?? "Unknown",
      defaultUnit: entry?.defaultUnit ?? null,
      history: historyMap.get(slug) || [],
      referenceRange: refMap.get(slug) || null,
    };
  });
}

export async function getUserBiomarkerSlugs(
  userId: string
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ canonicalSlug: biomarkerResults.canonicalSlug })
    .from(biomarkerResults)
    .innerJoin(reports, eq(biomarkerResults.reportId, reports.id))
    .where(eq(reports.userId, userId));

  return rows
    .map((r) => r.canonicalSlug)
    .filter((s): s is string => s !== null);
}

"use server";

import { db } from "../index";
import {
  dashboards,
  dashboardItems,
  biomarkerResults,
  reports,
  referenceRanges,
} from "../schema";
import { eq, asc, and, inArray, sql } from "drizzle-orm";
import {
  DashboardSummary,
  DashboardDetail,
  BiomarkerDetailData,
  BiomarkerHistoryPoint,
  ReferenceRange,
} from "@/lib/types";
import { REGISTRY } from "@/lib/biomarker-registry";
import { requireUser } from "./auth";

export async function getDashboards(): Promise<DashboardSummary[]> {
  const userId = await requireUser();

  const rows = await db
    .select({
      id: dashboards.id,
      name: dashboards.name,
      updatedAt: dashboards.updatedAt,
      biomarkerCount: sql<number>`count(${dashboardItems.id})::int`,
    })
    .from(dashboards)
    .leftJoin(dashboardItems, eq(dashboardItems.dashboardId, dashboards.id))
    .where(eq(dashboards.userId, userId))
    .groupBy(dashboards.id, dashboards.name, dashboards.updatedAt)
    .orderBy(asc(dashboards.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    biomarkerCount: r.biomarkerCount,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getDashboard(
  id: string
): Promise<DashboardDetail | null> {
  const userId = await requireUser();

  const rows = await db
    .select()
    .from(dashboards)
    .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));

  if (rows.length === 0) return null;

  const items = await db
    .select({
      id: dashboardItems.id,
      canonicalSlug: dashboardItems.canonicalSlug,
      sortOrder: dashboardItems.sortOrder,
      groupId: dashboardItems.groupId,
    })
    .from(dashboardItems)
    .where(eq(dashboardItems.dashboardId, id))
    .orderBy(asc(dashboardItems.sortOrder));

  return {
    id: rows[0].id,
    name: rows[0].name,
    items,
  };
}

export async function createDashboard(
  name: string,
  slugs: string[],
  groups?: string[][] // each sub-array is a group of slugs that share a chart
): Promise<string> {
  const userId = await requireUser();

  const [row] = await db
    .insert(dashboards)
    .values({ userId, name })
    .returning({ id: dashboards.id });

  if (slugs.length > 0) {
    // Build slug → groupId mapping from groups param
    const slugToGroupId = new Map<string, string>();
    if (groups) {
      for (const group of groups) {
        const gid = crypto.randomUUID();
        for (const s of group) slugToGroupId.set(s, gid);
      }
    }

    await db.insert(dashboardItems).values(
      slugs.map((slug, i) => ({
        dashboardId: row.id,
        canonicalSlug: slug,
        sortOrder: i,
        groupId: slugToGroupId.get(slug) ?? null,
      }))
    );
  }

  return row.id;
}

export async function updateDashboard(
  id: string,
  data: { name: string }
): Promise<void> {
  const userId = await requireUser();

  await db
    .update(dashboards)
    .set({ name: data.name, updatedAt: new Date() })
    .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
}

export async function deleteDashboard(id: string): Promise<void> {
  const userId = await requireUser();

  await db
    .delete(dashboards)
    .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
}

export async function addDashboardItem(
  dashboardId: string,
  slug: string
): Promise<string> {
  const userId = await requireUser();

  // Verify ownership
  const rows = await db
    .select({ id: dashboards.id })
    .from(dashboards)
    .where(
      and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId))
    );
  if (rows.length === 0) throw new Error("Dashboard not found");

  // Get max sort order
  const maxRows = await db
    .select({ max: sql<number>`coalesce(max(${dashboardItems.sortOrder}), -1)` })
    .from(dashboardItems)
    .where(eq(dashboardItems.dashboardId, dashboardId));

  const nextOrder = (maxRows[0]?.max ?? -1) + 1;

  const [item] = await db
    .insert(dashboardItems)
    .values({ dashboardId, canonicalSlug: slug, sortOrder: nextOrder })
    .returning({ id: dashboardItems.id });

  await db
    .update(dashboards)
    .set({ updatedAt: new Date() })
    .where(eq(dashboards.id, dashboardId));

  return item.id;
}

export async function removeDashboardItem(
  dashboardId: string,
  itemId: string
): Promise<void> {
  const userId = await requireUser();

  // Verify ownership
  const rows = await db
    .select({ id: dashboards.id })
    .from(dashboards)
    .where(
      and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId))
    );
  if (rows.length === 0) throw new Error("Dashboard not found");

  await db.delete(dashboardItems).where(eq(dashboardItems.id, itemId));

  await db
    .update(dashboards)
    .set({ updatedAt: new Date() })
    .where(eq(dashboards.id, dashboardId));
}

export async function reorderDashboardItems(
  dashboardId: string,
  orderedItemIds: string[]
): Promise<void> {
  const userId = await requireUser();

  // Verify ownership
  const rows = await db
    .select({ id: dashboards.id })
    .from(dashboards)
    .where(
      and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId))
    );
  if (rows.length === 0) throw new Error("Dashboard not found");

  // Update each item's sort order
  for (let i = 0; i < orderedItemIds.length; i++) {
    await db
      .update(dashboardItems)
      .set({ sortOrder: i })
      .where(eq(dashboardItems.id, orderedItemIds[i]));
  }

  await db
    .update(dashboards)
    .set({ updatedAt: new Date() })
    .where(eq(dashboards.id, dashboardId));
}

/**
 * Batch-fetch history + reference ranges for multiple biomarkers in 2 queries
 * (not N). Returns BiomarkerDetailData[] ready for HistoryChart.
 */
export async function getDashboardChartData(
  slugs: string[]
): Promise<BiomarkerDetailData[]> {
  if (slugs.length === 0) return [];

  const userId = await requireUser();

  // 1. Batch fetch all history rows for these slugs
  const historyRows = await db
    .select({
      canonicalSlug: biomarkerResults.canonicalSlug,
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
    })
    .from(biomarkerResults)
    .innerJoin(reports, eq(biomarkerResults.reportId, reports.id))
    .where(
      and(
        inArray(biomarkerResults.canonicalSlug, slugs),
        eq(reports.userId, userId)
      )
    )
    .orderBy(asc(reports.collectionDate));

  // 2. Batch fetch all reference ranges for these slugs
  const refRows = await db
    .select()
    .from(referenceRanges)
    .where(inArray(referenceRanges.canonicalSlug, slugs));

  // Build lookup maps
  const historyMap = new Map<string, BiomarkerHistoryPoint[]>();
  for (const r of historyRows) {
    const slug = r.canonicalSlug!;
    const points = historyMap.get(slug) || [];
    points.push({
      collectionDate: r.collectionDate,
      value: r.value !== null ? Number(r.value) : null,
      valueText: r.valueText,
      valueModifier: r.valueModifier,
      unit: r.unit,
      flag: r.flag,
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
    });
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

  // Assemble BiomarkerDetailData for each slug
  return slugs.map((slug) => {
    const entry = REGISTRY.find((e) => e.slug === slug);
    return {
      slug,
      displayName: entry?.displayName ?? slug,
      fullName: entry?.fullName ?? slug,
      category: entry?.category ?? "Unknown",
      defaultUnit: entry?.defaultUnit ?? null,
      summary: entry?.summary,
      history: historyMap.get(slug) || [],
      referenceRange: refMap.get(slug) || null,
    };
  });
}

export async function groupDashboardItems(
  dashboardId: string,
  itemIds: string[]
): Promise<string> {
  const userId = await requireUser();

  // Verify ownership
  const rows = await db
    .select({ id: dashboards.id })
    .from(dashboards)
    .where(
      and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId))
    );
  if (rows.length === 0) throw new Error("Dashboard not found");

  const groupId = crypto.randomUUID();
  await db
    .update(dashboardItems)
    .set({ groupId })
    .where(
      and(
        eq(dashboardItems.dashboardId, dashboardId),
        inArray(dashboardItems.id, itemIds)
      )
    );

  await db
    .update(dashboards)
    .set({ updatedAt: new Date() })
    .where(eq(dashboards.id, dashboardId));

  return groupId;
}

export async function ungroupDashboardItems(
  dashboardId: string,
  groupId: string
): Promise<void> {
  const userId = await requireUser();

  // Verify ownership
  const rows = await db
    .select({ id: dashboards.id })
    .from(dashboards)
    .where(
      and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId))
    );
  if (rows.length === 0) throw new Error("Dashboard not found");

  await db
    .update(dashboardItems)
    .set({ groupId: null })
    .where(
      and(
        eq(dashboardItems.dashboardId, dashboardId),
        eq(dashboardItems.groupId, groupId)
      )
    );

  await db
    .update(dashboards)
    .set({ updatedAt: new Date() })
    .where(eq(dashboards.id, dashboardId));
}

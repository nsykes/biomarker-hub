"use server";

import { db } from "./index";
import { reports, biomarkerResults, settings } from "./schema";
import { eq, desc, inArray } from "drizzle-orm";
import { Biomarker, ExtractionMeta, StoredFile, AppSettings } from "../types";

// --- helpers ---

/** All report columns except the pdfData blob (avoids loading multi-MB binary in list/detail queries). */
const reportColumns = {
  id: reports.id,
  userId: reports.userId,
  filename: reports.filename,
  source: reports.source,
  labName: reports.labName,
  collectionDate: reports.collectionDate,
  reportType: reports.reportType,
  patientNameExtracted: reports.patientNameExtracted,
  pdfSizeBytes: reports.pdfSizeBytes,
  extractionModel: reports.extractionModel,
  extractionTokens: reports.extractionTokens,
  extractionDurationMs: reports.extractionDurationMs,
  addedAt: reports.addedAt,
  updatedAt: reports.updatedAt,
};

type ReportRow = Omit<typeof reports.$inferSelect, "pdfData">;

function toBiomarker(r: typeof biomarkerResults.$inferSelect): Biomarker {
  return {
    id: r.id,
    category: r.category,
    metricName: r.metricName,
    rawName: r.rawName,
    value: r.value !== null ? Number(r.value) : null,
    valueText: r.valueText,
    valueModifier: r.valueModifier,
    unit: r.unit,
    referenceRangeLow:
      r.referenceRangeLow !== null ? Number(r.referenceRangeLow) : null,
    referenceRangeHigh:
      r.referenceRangeHigh !== null ? Number(r.referenceRangeHigh) : null,
    flag: r.flag,
    page: r.page ?? 0,
    region: r.region,
    canonicalSlug: r.canonicalSlug,
  };
}

function toMeta(r: ReportRow): ExtractionMeta {
  return {
    model: r.extractionModel ?? "",
    tokensUsed: r.extractionTokens ?? null,
    duration: r.extractionDurationMs ?? null,
  };
}

function toStoredFile(r: ReportRow, biomarkers: Biomarker[]): StoredFile {
  return {
    id: r.id,
    filename: r.filename,
    addedAt: r.addedAt.toISOString(),
    source: r.source,
    labName: r.labName,
    collectionDate: r.collectionDate,
    reportType: r.reportType,
    biomarkers,
    meta: toMeta(r),
    pdfSizeBytes: r.pdfSizeBytes,
  };
}

function biomarkerToRow(reportId: string, b: Biomarker) {
  return {
    reportId,
    canonicalSlug: b.canonicalSlug,
    category: b.category,
    metricName: b.metricName,
    rawName: b.rawName,
    value: b.value !== null ? String(b.value) : null,
    valueText: b.valueText,
    valueModifier: b.valueModifier as "<" | ">" | null,
    unit: b.unit,
    referenceRangeLow:
      b.referenceRangeLow !== null ? String(b.referenceRangeLow) : null,
    referenceRangeHigh:
      b.referenceRangeHigh !== null ? String(b.referenceRangeHigh) : null,
    flag: b.flag,
    page: b.page,
    region: b.region,
  };
}

// --- file / report CRUD ---

export async function getFiles(): Promise<StoredFile[]> {
  const reportRows = await db
    .select(reportColumns)
    .from(reports)
    .orderBy(desc(reports.addedAt));

  if (reportRows.length === 0) return [];

  const reportIds = reportRows.map((r) => r.id);
  const biomarkerRows = await db
    .select()
    .from(biomarkerResults)
    .where(inArray(biomarkerResults.reportId, reportIds));

  const byReport = new Map<string, Biomarker[]>();
  for (const row of biomarkerRows) {
    const list = byReport.get(row.reportId) ?? [];
    list.push(toBiomarker(row));
    byReport.set(row.reportId, list);
  }

  return reportRows.map((r) => toStoredFile(r, byReport.get(r.id) ?? []));
}

export async function getFile(id: string): Promise<StoredFile | null> {
  const rows = await db.select(reportColumns).from(reports).where(eq(reports.id, id));
  if (rows.length === 0) return null;

  const r = rows[0];
  const biomarkerRows = await db
    .select()
    .from(biomarkerResults)
    .where(eq(biomarkerResults.reportId, id));

  return toStoredFile(r, biomarkerRows.map(toBiomarker));
}

export async function saveFile(data: {
  filename: string;
  source: string | null;
  labName: string | null;
  collectionDate: string | null;
  reportType: string | null;
  biomarkers: Biomarker[];
  meta: ExtractionMeta;
}): Promise<string> {
  const [row] = await db
    .insert(reports)
    .values({
      filename: data.filename,
      source: data.source,
      labName: data.labName,
      collectionDate: data.collectionDate,
      reportType: data.reportType as
        | "blood_panel"
        | "dexa_scan"
        | "other"
        | null,
      extractionModel: data.meta.model,
      extractionTokens: data.meta.tokensUsed,
      extractionDurationMs: data.meta.duration,
    })
    .returning({ id: reports.id });

  if (data.biomarkers.length > 0) {
    await db
      .insert(biomarkerResults)
      .values(data.biomarkers.map((b) => biomarkerToRow(row.id, b)));
  }

  return row.id;
}

export async function deleteFile(id: string): Promise<void> {
  await db.delete(reports).where(eq(reports.id, id));
}

export async function updateFileBiomarkers(
  id: string,
  biomarkers: Biomarker[]
): Promise<void> {
  await db
    .delete(biomarkerResults)
    .where(eq(biomarkerResults.reportId, id));

  if (biomarkers.length > 0) {
    await db
      .insert(biomarkerResults)
      .values(biomarkers.map((b) => biomarkerToRow(id, b)));
  }
}

// --- settings ---

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  if (rows.length === 0) {
    const [row] = await db.insert(settings).values({}).returning();
    return {
      id: row.id,
      openRouterApiKey: row.openRouterApiKey,
      defaultModel: row.defaultModel,
    };
  }
  const r = rows[0];
  return {
    id: r.id,
    openRouterApiKey: r.openRouterApiKey,
    defaultModel: r.defaultModel,
  };
}

export async function updateSettings(
  data: Partial<Pick<AppSettings, "openRouterApiKey" | "defaultModel">>
): Promise<void> {
  const current = await getSettings();
  await db
    .update(settings)
    .set(data)
    .where(eq(settings.id, current.id));
}

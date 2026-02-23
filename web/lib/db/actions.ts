"use server";

import { db } from "./index";
import { files, settings } from "./schema";
import { eq, desc } from "drizzle-orm";
import { Biomarker, ExtractionMeta, StoredFile, AppSettings } from "../types";

export async function getFiles(): Promise<StoredFile[]> {
  const rows = await db.select().from(files).orderBy(desc(files.addedAt));
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    addedAt: r.addedAt.toISOString(),
    source: r.source,
    labName: r.labName,
    collectionDate: r.collectionDate,
    reportType: r.reportType,
    biomarkers: r.biomarkers as Biomarker[],
    meta: r.meta as ExtractionMeta,
  }));
}

export async function getFile(id: string): Promise<StoredFile | null> {
  const rows = await db.select().from(files).where(eq(files.id, id));
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    filename: r.filename,
    addedAt: r.addedAt.toISOString(),
    source: r.source,
    labName: r.labName,
    collectionDate: r.collectionDate,
    reportType: r.reportType,
    biomarkers: r.biomarkers as Biomarker[],
    meta: r.meta as ExtractionMeta,
  };
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
    .insert(files)
    .values({
      filename: data.filename,
      source: data.source,
      labName: data.labName,
      collectionDate: data.collectionDate,
      reportType: data.reportType,
      biomarkers: data.biomarkers,
      meta: data.meta,
    })
    .returning({ id: files.id });
  return row.id;
}

export async function deleteFile(id: string): Promise<void> {
  await db.delete(files).where(eq(files.id, id));
}

export async function updateFileBiomarkers(
  id: string,
  biomarkers: Biomarker[]
): Promise<void> {
  await db
    .update(files)
    .set({ biomarkers })
    .where(eq(files.id, id));
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  if (rows.length === 0) {
    const [row] = await db
      .insert(settings)
      .values({})
      .returning();
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

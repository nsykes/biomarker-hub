"use server";

import { db } from "../index";
import { reports, settings, profiles, dashboards, apiKeys } from "../schema";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth";
import { ActionResult } from "../result";

export async function deleteAccount(): Promise<ActionResult> {
  try {
    const userId = await requireUser();

    // Batch all deletes into a single HTTP request for atomicity.
    // CASCADE: dashboards -> dashboard_items, reports -> biomarker_results.
    await db.batch([
      db.delete(dashboards).where(eq(dashboards.userId, userId)),
      db.delete(reports).where(eq(reports.userId, userId)),
      db.delete(apiKeys).where(eq(apiKeys.userId, userId)),
      db.delete(settings).where(eq(settings.userId, userId)),
      db.delete(profiles).where(eq(profiles.userId, userId)),
    ]);

    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

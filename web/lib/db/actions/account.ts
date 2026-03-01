"use server";

import { db } from "../index";
import { reports, settings, profiles, dashboards, apiKeys } from "../schema";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth";
import { ActionResult } from "../result";

export async function deleteAccount(): Promise<ActionResult> {
  try {
    const userId = await requireUser();

    // dashboards CASCADE-deletes all dashboard_items
    await db.delete(dashboards).where(eq(dashboards.userId, userId));
    // reports CASCADE-deletes all biomarker_results
    await db.delete(reports).where(eq(reports.userId, userId));
    await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
    await db.delete(settings).where(eq(settings.userId, userId));
    await db.delete(profiles).where(eq(profiles.userId, userId));

    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

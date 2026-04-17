"use server";

import { db } from "../index";
import {
  reports,
  settings,
  profiles,
  dashboards,
  apiKeys,
  goals,
  doctorShares,
  oauthCodes,
  oauthTokens,
} from "../schema";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth";
import { ActionResult } from "../result";

/** Delete all application rows owned by the current user in one batch.
 *  Does NOT remove the Neon Auth (Better Auth) user record — the client
 *  calls `authClient.deleteUser()` after this returns so the auth side
 *  cleanup happens with a valid session. */
export async function deleteAccount(): Promise<ActionResult> {
  try {
    const userId = await requireUser();

    // CASCADE handles child rows: dashboards → dashboard_items,
    // reports → biomarker_results. Everything else is deleted explicitly.
    await db.batch([
      db.delete(dashboards).where(eq(dashboards.userId, userId)),
      db.delete(reports).where(eq(reports.userId, userId)),
      db.delete(apiKeys).where(eq(apiKeys.userId, userId)),
      db.delete(goals).where(eq(goals.userId, userId)),
      db.delete(doctorShares).where(eq(doctorShares.userId, userId)),
      db.delete(oauthCodes).where(eq(oauthCodes.userId, userId)),
      db.delete(oauthTokens).where(eq(oauthTokens.userId, userId)),
      db.delete(settings).where(eq(settings.userId, userId)),
      db.delete(profiles).where(eq(profiles.userId, userId)),
    ]);

    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

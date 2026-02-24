"use server";

import { db } from "../index";
import { settings } from "../schema";
import { eq, and } from "drizzle-orm";
import { AppSettings } from "@/lib/types";
import { requireUser } from "./auth";

export async function getSettings(): Promise<AppSettings> {
  const userId = await requireUser();

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId));

  if (rows.length === 0) {
    const [row] = await db
      .insert(settings)
      .values({ userId })
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
): Promise<AppSettings> {
  const userId = await requireUser();
  const current = await getSettings();
  const rows = await db
    .update(settings)
    .set(data)
    .where(and(eq(settings.id, current.id), eq(settings.userId, userId)))
    .returning();

  if (rows.length === 0) {
    throw new Error("Failed to update settings");
  }

  const r = rows[0];
  return {
    id: r.id,
    openRouterApiKey: r.openRouterApiKey,
    defaultModel: r.defaultModel,
  };
}

// Safe wrappers that return errors as data instead of throwing.
// Next.js sanitizes thrown errors in server actions, so the client never sees
// the real message. These wrappers catch and return the error string.

type SafeResult<T> = { data: T; error: null } | { data: null; error: string };

export async function getSettingsSafe(): Promise<SafeResult<AppSettings>> {
  try {
    return { data: await getSettings(), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateSettingsSafe(
  data: Partial<Pick<AppSettings, "openRouterApiKey" | "defaultModel">>
): Promise<SafeResult<AppSettings>> {
  try {
    return { data: await updateSettings(data), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

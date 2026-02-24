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
): Promise<void> {
  const userId = await requireUser();
  const current = await getSettings();
  await db
    .update(settings)
    .set(data)
    .where(and(eq(settings.id, current.id), eq(settings.userId, userId)));
}

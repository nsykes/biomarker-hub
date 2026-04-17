"use server";

import { db } from "../index";
import { goals } from "../schema";
import { eq, asc, and, sql } from "drizzle-orm";
import { GoalRow, BiomarkerDetailData } from "@/lib/types";
import { requireUser } from "./auth";
import { getBatchChartDataByUser } from "../queries/biomarkers";

export async function getGoals(): Promise<GoalRow[]> {
  const userId = await requireUser();

  const rows = await db
    .select({
      id: goals.id,
      canonicalSlug: goals.canonicalSlug,
      targetValue: goals.targetValue,
      sortOrder: goals.sortOrder,
    })
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(asc(goals.sortOrder));

  return rows.map((r) => ({
    ...r,
    targetValue: Number(r.targetValue),
  }));
}

export async function createGoal(
  canonicalSlug: string,
  targetValue: number
): Promise<string> {
  const userId = await requireUser();

  // Get max sort order
  const maxRows = await db
    .select({
      max: sql<number>`coalesce(max(${goals.sortOrder}), -1)`,
    })
    .from(goals)
    .where(eq(goals.userId, userId));

  const nextOrder = (maxRows[0]?.max ?? -1) + 1;

  try {
    const [row] = await db
      .insert(goals)
      .values({
        userId,
        canonicalSlug,
        targetValue: String(targetValue),
        sortOrder: nextOrder,
      })
      .returning({ id: goals.id });

    return row.id;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "23505") {
      throw new Error("A goal already exists for this biomarker");
    }
    throw error;
  }
}

export async function updateGoalTarget(
  goalId: string,
  targetValue: number
): Promise<void> {
  const userId = await requireUser();

  await db
    .update(goals)
    .set({ targetValue: String(targetValue), updatedAt: new Date() })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
}

export async function deleteGoal(goalId: string): Promise<void> {
  const userId = await requireUser();

  await db
    .delete(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
}

export async function reorderGoals(
  orderedGoalIds: string[]
): Promise<void> {
  const userId = await requireUser();

  if (orderedGoalIds.length === 0) return;

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedGoalIds.length; i++) {
      await tx
        .update(goals)
        .set({ sortOrder: i })
        .where(and(eq(goals.id, orderedGoalIds[i]), eq(goals.userId, userId)));
    }
  });
}

export async function getGoalChartData(
  slugs: string[]
): Promise<BiomarkerDetailData[]> {
  const userId = await requireUser();
  return getBatchChartDataByUser(userId, slugs);
}

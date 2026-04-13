import { useState, useCallback, useEffect, useMemo } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { GoalRow, GoalCardEntry, BiomarkerDetailData } from "@/lib/types";
import {
  getGoals,
  createGoal,
  updateGoalTarget,
  deleteGoal,
  reorderGoals,
  getGoalChartData,
} from "@/lib/db/actions";

function buildCardEntries(
  goals: GoalRow[],
  chartData: Map<string, BiomarkerDetailData>
): GoalCardEntry[] {
  return goals
    .map((goal) => {
      const data = chartData.get(goal.canonicalSlug);
      if (!data) return null;
      return { goal, data };
    })
    .filter(Boolean) as GoalCardEntry[];
}

export function useGoalData() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [chartData, setChartData] = useState<Map<string, BiomarkerDetailData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  const cardEntries = useMemo(
    () => buildCardEntries(goals, chartData),
    [goals, chartData]
  );

  const loadData = useCallback(async () => {
    try {
      const rows = await getGoals();
      setGoals(rows);

      const slugs = rows.map((g) => g.canonicalSlug);
      if (slugs.length > 0) {
        const data = await getGoalChartData(slugs);
        const map = new Map<string, BiomarkerDetailData>();
        for (const d of data) {
          map.set(d.slug, d);
        }
        setChartData(map);
      }
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateGoal = useCallback(
    async (slug: string, targetValue: number) => {
      if (goals.some((g) => g.canonicalSlug === slug)) return;

      const tempId = crypto.randomUUID();
      const newGoal: GoalRow = {
        id: tempId,
        canonicalSlug: slug,
        targetValue,
        sortOrder: goals.length,
      };
      setGoals((prev) => [...prev, newGoal]);

      const data = await getGoalChartData([slug]);
      if (data.length > 0) {
        setChartData((prev) => new Map(prev).set(slug, data[0]));
      }

      const realId = await createGoal(slug, targetValue);
      setGoals((prev) =>
        prev.map((g) => (g.id === tempId ? { ...g, id: realId } : g))
      );
    },
    [goals]
  );

  const handleUpdateGoal = useCallback(
    async (goalId: string, targetValue: number) => {
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, targetValue } : g))
      );
      await updateGoalTarget(goalId, targetValue);
    },
    []
  );

  const handleRemoveGoal = useCallback(async (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    await deleteGoal(goalId);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = goals.findIndex((g) => g.id === active.id);
      const newIndex = goals.findIndex((g) => g.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(goals, oldIndex, newIndex).map((g, i) => ({
        ...g,
        sortOrder: i,
      }));
      setGoals(reordered);

      await reorderGoals(reordered.map((g) => g.id));
    },
    [goals]
  );

  return {
    goals,
    cardEntries,
    loading,
    loadData,
    handleCreateGoal,
    handleUpdateGoal,
    handleRemoveGoal,
    handleDragEnd,
  };
}

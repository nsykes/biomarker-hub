"use client";

import { useState } from "react";
import { GoalRow } from "@/lib/types";
import { useGoalData } from "@/hooks/useGoalData";
import { GoalGrid } from "./goals/GoalGrid";
import { CreateGoalModal } from "./CreateGoalModal";
import { PageSpinner } from "./Spinner";
import { REGISTRY } from "@/lib/biomarker-registry";

interface GoalsTabProps {
  onNavigateToBiomarker: (slug: string) => void;
}

export function GoalsTab({ onNavigateToBiomarker }: GoalsTabProps) {
  const {
    cardEntries,
    loading,
    handleCreateGoal,
    handleUpdateGoal,
    handleRemoveGoal,
    handleDragEnd,
  } = useGoalData();

  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState<
    (GoalRow & { displayName: string; defaultUnit: string | null }) | null
  >(null);

  const handleEdit = (goal: GoalRow) => {
    const entry = REGISTRY.find((e) => e.slug === goal.canonicalSlug);
    setEditingGoal({
      ...goal,
      displayName: entry?.displayName ?? goal.canonicalSlug,
      defaultUnit: entry?.defaultUnit ?? null,
    });
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (cardEntries.length === 0 && !showCreate) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] gap-5 p-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[var(--color-primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              No goals yet
            </p>
            <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
              Set a target for any biomarker to track your progress
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary mt-1"
          >
            Set a Goal
          </button>
        </div>

        {showCreate && (
          <CreateGoalModal
            onSubmit={handleCreateGoal}
            onClose={() => setShowCreate(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative h-full">
      <div className="overflow-auto h-full">
        <div className="p-3 md:p-4">
          <GoalGrid
            cardEntries={cardEntries}
            onDragEnd={handleDragEnd}
            onRemoveGoal={handleRemoveGoal}
            onEditGoal={handleEdit}
            onNavigate={onNavigateToBiomarker}
          />
        </div>
      </div>

      {/* FAB button */}
      <button
        onClick={() => setShowCreate(true)}
        className="absolute bottom-above-tab-bar right-4 md:right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #0A84FF, #0070E0)",
        }}
        title="Set a goal"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>

      {showCreate && (
        <CreateGoalModal
          onSubmit={handleCreateGoal}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingGoal && (
        <CreateGoalModal
          editGoal={editingGoal}
          onSubmit={async (_slug, targetValue) => {
            await handleUpdateGoal(editingGoal.id, targetValue);
          }}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  );
}

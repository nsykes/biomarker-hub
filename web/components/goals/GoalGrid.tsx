"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { GoalRow, GoalCardEntry } from "@/lib/types";
import { GoalChartCard } from "../GoalChartCard";

interface GoalGridProps {
  cardEntries: GoalCardEntry[];
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveGoal: (goalId: string) => void;
  onEditGoal: (goal: GoalRow) => void;
  onNavigate: (slug: string) => void;
}

export function GoalGrid({
  cardEntries,
  onDragEnd,
  onRemoveGoal,
  onEditGoal,
  onNavigate,
}: GoalGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={cardEntries.map((e) => e.goal.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {cardEntries.map((entry) => (
            <GoalChartCard
              key={entry.goal.id}
              goal={entry.goal}
              data={entry.data}
              onRemove={() => onRemoveGoal(entry.goal.id)}
              onEdit={() => onEditGoal(entry.goal)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

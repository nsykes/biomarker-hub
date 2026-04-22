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
import { DashboardSummary } from "@/lib/types";
import { DashboardCard } from "./DashboardCard";

interface DashboardsGridProps {
  dashboards: DashboardSummary[];
  onDragEnd: (event: DragEndEvent) => void;
  onOpenDashboard: (id: string) => void;
}

export function DashboardsGrid({
  dashboards,
  onDragEnd,
  onOpenDashboard,
}: DashboardsGridProps) {
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
        items={dashboards.map((d) => d.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {dashboards.map((d) => (
            <DashboardCard
              key={d.id}
              dashboard={d}
              onOpen={onOpenDashboard}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

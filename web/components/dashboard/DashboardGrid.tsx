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
import { DashboardItem, DashboardCardEntry } from "@/lib/types";
import { DashboardChartCard } from "../DashboardChartCard";
import { MultiMetricChartCard } from "../MultiMetricChartCard";

interface DashboardGridProps {
  items: DashboardItem[];
  cardEntries: DashboardCardEntry[];
  mergeMode: boolean;
  selectedItemIds: Set<string>;
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveItem: (item: DashboardItem) => void;
  onUngroup: (groupId: string) => void;
  onNavigate: (slug: string) => void;
  onToggleSelect: (id: string) => void;
  onMerge: () => void;
}

export function DashboardGrid({
  items,
  cardEntries,
  mergeMode,
  selectedItemIds,
  onDragEnd,
  onRemoveItem,
  onUngroup,
  onNavigate,
  onToggleSelect,
  onMerge,
}: DashboardGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={cardEntries.map((e) =>
            e.type === "single" ? e.itemId : e.groupId
          )}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cardEntries.map((entry) => {
              if (entry.type === "group") {
                return (
                  <MultiMetricChartCard
                    key={entry.groupId}
                    groupId={entry.groupId}
                    dataList={entry.dataList}
                    onUngroup={() => onUngroup(entry.groupId)}
                    onNavigate={onNavigate}
                  />
                );
              }
              return (
                <div
                  key={entry.itemId}
                  className={`relative ${
                    mergeMode && selectedItemIds.has(entry.itemId)
                      ? "ring-2 ring-[var(--color-primary)] rounded-xl"
                      : ""
                  }`}
                >
                  <DashboardChartCard
                    itemId={entry.itemId}
                    data={entry.data}
                    onRemove={() => {
                      const item = items.find((i) => i.id === entry.itemId);
                      if (item) onRemoveItem(item);
                    }}
                    onNavigate={onNavigate}
                    mergeMode={mergeMode}
                    selected={selectedItemIds.has(entry.itemId)}
                    onToggleSelect={() => onToggleSelect(entry.itemId)}
                  />
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Merge floating bar */}
      {mergeMode && selectedItemIds.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={onMerge}
            className="btn-primary shadow-xl px-6 py-3 rounded-full text-sm font-semibold"
          >
            Merge {selectedItemIds.size} charts
          </button>
        </div>
      )}
    </>
  );
}

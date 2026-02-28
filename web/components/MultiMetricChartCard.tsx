"use client";

import { BiomarkerDetailData } from "@/lib/types";
import { MultiMetricChart } from "./MultiMetricChart";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MultiMetricChartCardProps {
  groupId: string;
  dataList: BiomarkerDetailData[];
  onUngroup: () => void;
  onNavigate: (slug: string) => void;
}

export function MultiMetricChartCard({
  groupId,
  dataList,
  onUngroup,
  onNavigate,
}: MultiMetricChartCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: groupId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border-light)]">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-[var(--color-surface-tertiary)] cursor-grab active:cursor-grabbing text-[var(--color-text-tertiary)] flex-shrink-0 touch-none"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        {/* Titles — clickable individual names */}
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {dataList.map((d, i) => (
            <button
              key={d.slug}
              onClick={() => onNavigate(d.slug)}
              className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors truncate"
            >
              {d.displayName}
              {i < dataList.length - 1 && (
                <span className="text-[var(--color-text-quaternary)] ml-1">/</span>
              )}
            </button>
          ))}
        </div>

        {/* Split button */}
        <button
          onClick={onUngroup}
          className="ml-auto p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors flex-shrink-0"
          title="Split into separate charts"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 12h8m-8 5h8M4 7h.01M4 12h.01M4 17h.01" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div className="p-3">
        <MultiMetricChart dataList={dataList} />
      </div>
    </div>
  );
}

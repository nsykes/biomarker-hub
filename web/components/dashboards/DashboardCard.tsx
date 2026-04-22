"use client";

import { DashboardSummary } from "@/lib/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DashboardCardProps {
  dashboard: DashboardSummary;
  onOpen: (id: string) => void;
}

export function DashboardCard({ dashboard, onOpen }: DashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dashboard.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card hover:shadow-md transition-all duration-200 hover:border-[var(--color-primary)] group"
    >
      <div className="flex items-start gap-2 pl-2 pr-5 py-4">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-[var(--color-surface-tertiary)] cursor-grab active:cursor-grabbing text-[var(--color-text-tertiary)] flex-shrink-0 touch-none mt-0.5"
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
        <button
          onClick={() => onOpen(dashboard.id)}
          className="flex-1 flex items-start justify-between text-left min-w-0"
        >
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
              {dashboard.name}
            </h3>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              {dashboard.biomarkerCount}{" "}
              {dashboard.biomarkerCount === 1 ? "biomarker" : "biomarkers"}
            </p>
          </div>
          <svg
            className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0 mt-0.5 ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

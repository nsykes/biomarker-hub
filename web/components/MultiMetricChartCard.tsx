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
          {/* Info tooltip */}
          {dataList.some((d) => d.summary) && (
            <div className="relative group/info flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] cursor-help" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              <div className="invisible group-hover/info:visible absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-72 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl shadow-lg px-3 py-2.5 z-30">
                {dataList.map((d) =>
                  d.summary ? (
                    <div key={d.slug} className={dataList.filter((x) => x.summary).length > 1 ? "mb-2 last:mb-0" : ""}>
                      {dataList.filter((x) => x.summary).length > 1 && (
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-0.5">{d.displayName}</p>
                      )}
                      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{d.summary}</p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
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

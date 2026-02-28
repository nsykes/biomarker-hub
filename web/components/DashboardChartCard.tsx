"use client";

import { useMemo } from "react";
import { BiomarkerDetailData } from "@/lib/types";
import { HistoryChart } from "./biomarker-detail/HistoryChart";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { computeTrend } from "@/lib/trend";
import { FLAG_COLORS, TREND_SENTIMENT_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface DashboardChartCardProps {
  itemId: string;
  data: BiomarkerDetailData;
  onRemove: () => void;
  onNavigate: (slug: string) => void;
}

export function DashboardChartCard({
  itemId,
  data,
  onRemove,
  onNavigate,
}: DashboardChartCardProps) {
  const trend = useMemo(
    () => computeTrend(data.slug, data.history, data.referenceRange),
    [data.slug, data.history, data.referenceRange]
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

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

        {/* Title — clickable */}
        <button
          onClick={() => onNavigate(data.slug)}
          className="flex items-center gap-2 min-w-0 hover:text-[var(--color-primary)] transition-colors"
        >
          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {data.displayName}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex-shrink-0">
            {data.category}
          </span>
        </button>

        {/* Info tooltip */}
        {data.summary && (
          <div className="relative group/info flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] cursor-help" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
            <div className="invisible group-hover/info:visible absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-64 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl shadow-lg px-3 py-2.5 z-30">
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{data.summary}</p>
            </div>
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="ml-auto p-1.5 rounded-lg hover:bg-[var(--color-error-bg)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors flex-shrink-0"
          title="Remove from dashboard"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Latest value + trend */}
      {trend && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border-light)]">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: FLAG_COLORS[trend.latestFlag] ?? "#8E8E93" }}
          />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {parseFloat(trend.latestValue.toFixed(2))}{" "}
            <span className="font-normal text-[var(--color-text-tertiary)]">
              {trend.latestUnit ?? ""}
            </span>
          </span>
          {trend.direction && (
            <span
              className="text-xs font-semibold"
              style={{ color: TREND_SENTIMENT_COLORS[trend.sentiment] }}
            >
              {trend.direction === "up" ? "\u2191" : trend.direction === "down" ? "\u2193" : "\u2192"}
            </span>
          )}
          <span className="text-xs text-[var(--color-text-tertiary)] ml-auto">
            {formatDate(trend.latestDate)}
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="p-3">
        <HistoryChart data={data} />
      </div>
    </div>
  );
}

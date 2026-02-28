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

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="ml-auto p-1.5 rounded-lg hover:bg-[#FDE8E8] text-[var(--color-text-tertiary)] hover:text-[#FF3B30] transition-colors flex-shrink-0"
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

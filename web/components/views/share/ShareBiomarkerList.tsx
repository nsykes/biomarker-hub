"use client";

import { useMemo, useState } from "react";
import {
  REGISTRY,
  CanonicalBiomarker,
  BiomarkerCategory,
} from "@/lib/biomarker-registry";
import type { SharedBiomarkerSummary } from "@/lib/db/actions/doctor-shares";
import { FlagBadge } from "@/components/FlagBadge";
import { useCategoryCollapse } from "@/hooks/useCategoryCollapse";
import type { BiomarkerFlag } from "@/lib/types";

interface ShareBiomarkerListProps {
  userName: string;
  summaries: SharedBiomarkerSummary[];
  onSelect: (slug: string) => void;
}

export function ShareBiomarkerList({
  userName,
  summaries,
  onSelect,
}: ShareBiomarkerListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const {
    toggle: toggleCategory,
    isCollapsed,
    expandAll,
    collapseAll,
    anyCollapsed,
  } = useCategoryCollapse();

  const slugSet = useMemo(
    () => new Set(summaries.map((s) => s.slug)),
    [summaries]
  );
  const summaryMap = useMemo(() => {
    const map = new Map<string, SharedBiomarkerSummary>();
    for (const s of summaries) map.set(s.slug, s);
    return map;
  }, [summaries]);

  const groupedRegistry = useMemo(() => {
    const groups = new Map<BiomarkerCategory, CanonicalBiomarker[]>();
    for (const entry of REGISTRY) {
      if (!slugSet.has(entry.slug)) continue;
      const existing = groups.get(entry.category) || [];
      existing.push(entry);
      groups.set(entry.category, existing);
    }
    return groups;
  }, [slugSet]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedRegistry;
    const q = searchQuery.toLowerCase();
    const filtered = new Map<BiomarkerCategory, CanonicalBiomarker[]>();
    for (const [cat, entries] of groupedRegistry) {
      if (cat.toLowerCase().includes(q)) {
        filtered.set(cat, entries);
        continue;
      }
      const matching = entries.filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.fullName.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          e.aliases.some((a: string) => a.toLowerCase().includes(q))
      );
      if (matching.length > 0) filtered.set(cat, matching);
    }
    return filtered;
  }, [groupedRegistry, searchQuery]);

  const biomarkerCount = useMemo(
    () =>
      Array.from(groupedRegistry.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
    [groupedRegistry]
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--color-surface-secondary)]">
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border-light)] safe-pt px-4 md:px-5 pb-3 md:pb-4">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {userName}&apos;s Biomarkers
        </h1>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
          Read-only view
        </p>
      </div>

      <div className="px-3 md:px-5 py-2 md:py-3 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] flex-shrink-0">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search biomarkers..."
            className="input-base !pl-10 !rounded-xl"
            style={{ boxShadow: "var(--shadow-sm)" }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {biomarkerCount} biomarkers across {groupedRegistry.size} categories
          </p>
          <button
            onClick={() =>
              anyCollapsed
                ? expandAll()
                : collapseAll(Array.from(filteredGroups.keys()))
            }
            className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
          >
            {anyCollapsed ? "Expand All" : "Collapse All"}
          </button>
        </div>
      </div>

      <div>
        {Array.from(filteredGroups.entries()).map(([category, entries]) => (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-4 md:px-5 py-2.5 bg-[var(--color-surface-tertiary)]/80 backdrop-blur-sm border-b border-[var(--color-border-light)] text-left hover:bg-[var(--color-surface-tertiary)] transition-colors sticky top-0 z-10"
            >
              <svg
                className={`w-3 h-3 text-[var(--color-text-tertiary)] transition-transform duration-200 ${
                  isCollapsed(category) ? "" : "rotate-90"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                {category}
              </span>
              <span className="text-xs text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full font-medium">
                {entries.length}
              </span>
            </button>

            {!isCollapsed(category) && (
              <div className="divide-y divide-[var(--color-border-light)]">
                {entries.map((entry) => {
                  const summary = summaryMap.get(entry.slug);
                  return (
                    <button
                      key={entry.slug}
                      onClick={() => onSelect(entry.slug)}
                      className="w-full flex items-center gap-2 md:gap-4 px-4 md:px-5 py-2.5 text-left hover:bg-[var(--color-primary-light)] transition-colors duration-150"
                    >
                      <span className="text-sm text-[var(--color-text-primary)] flex-1 min-w-0 truncate">
                        {entry.displayName}
                        {entry.fullName !== entry.displayName && (
                          <span className="hidden md:inline text-xs text-[var(--color-text-tertiary)] ml-1.5">
                            {entry.fullName}
                          </span>
                        )}
                        {entry.region && (
                          <span className="text-xs text-[var(--color-text-tertiary)] ml-1">
                            ({entry.region})
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)] w-16 md:w-24 text-right flex-shrink-0 tabular-nums truncate">
                        {summary
                          ? summary.latestValueText ??
                            (summary.latestValue !== null
                              ? String(summary.latestValue)
                              : "\u2014")
                          : "\u2014"}
                      </span>
                      <span className="hidden sm:inline text-xs text-[var(--color-text-tertiary)] w-16 text-right flex-shrink-0 truncate">
                        {entry.defaultUnit || ""}
                      </span>
                      <span className="flex-shrink-0 w-auto md:w-24 text-right">
                        {summary && (
                          <FlagBadge
                            flag={summary.latestFlag as BiomarkerFlag}
                          />
                        )}
                      </span>
                      <svg
                        className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

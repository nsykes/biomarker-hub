"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { StoredFile, BiomarkerHistoryPoint } from "@/lib/types";
import {
  REGISTRY,
  CanonicalBiomarker,
  BiomarkerCategory,
} from "@/lib/biomarker-registry";
import { FlagBadge } from "./FlagBadge";
import { PageSpinner } from "./Spinner";
import { useCategoryCollapse } from "@/hooks/useCategoryCollapse";
import { getFiles } from "@/lib/db/actions";
import { BiomarkerDetailView } from "./BiomarkerDetailPage";

interface BiomarkersTabProps {
  initialBiomarkerSlug?: string | null;
}

export function BiomarkersTab({ initialBiomarkerSlug }: BiomarkersTabProps) {
  const [activeBiomarkerSlug, setActiveBiomarkerSlug] = useState<string | null>(
    initialBiomarkerSlug ?? null
  );
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggle: toggleCategory, isCollapsed, expandAll, collapseAll, anyCollapsed } = useCategoryCollapse();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getFiles()
      .then(setFiles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build a map: canonicalSlug -> BiomarkerHistoryPoint[]
  const historyMap = useMemo(() => {
    const map = new Map<string, BiomarkerHistoryPoint[]>();
    for (const file of files) {
      for (const b of file.biomarkers) {
        if (!b.canonicalSlug) continue;
        const existing = map.get(b.canonicalSlug) || [];
        existing.push({
          collectionDate: file.collectionDate,
          value: b.value,
          valueText: b.valueText,
          valueModifier: b.valueModifier,
          unit: b.unit,
          flag: b.flag,
          reportId: file.id,
          filename: file.filename,
          labName: file.labName,
          source: file.source,
          referenceRangeLow: b.referenceRangeLow,
          referenceRangeHigh: b.referenceRangeHigh,
          page: b.page,
        });
        map.set(b.canonicalSlug, existing);
      }
    }
    return map;
  }, [files]);

  // Group registry by category
  const groupedRegistry = useMemo(() => {
    const groups = new Map<BiomarkerCategory, CanonicalBiomarker[]>();
    for (const entry of REGISTRY) {
      const existing = groups.get(entry.category) || [];
      existing.push(entry);
      groups.set(entry.category, existing);
    }
    return groups;
  }, []);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedRegistry;
    const q = searchQuery.toLowerCase();
    const filtered = new Map<BiomarkerCategory, CanonicalBiomarker[]>();
    for (const [cat, entries] of groupedRegistry) {
      const matching = entries.filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.fullName.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q))
      );
      if (matching.length > 0) {
        filtered.set(cat, matching);
      }
    }
    return filtered;
  }, [groupedRegistry, searchQuery]);

  const getLatestValue = (slug: string): BiomarkerHistoryPoint | null => {
    const entries = historyMap.get(slug);
    if (!entries || entries.length === 0) return null;
    return entries[0]; // files are sorted by addedAt desc
  };

  const handleBack = useCallback(() => {
    setActiveBiomarkerSlug(null);
  }, []);

  if (activeBiomarkerSlug) {
    return (
      <BiomarkerDetailView
        slug={activeBiomarkerSlug}
        onBack={handleBack}
      />
    );
  }

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-5 py-3 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] flex-shrink-0">
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
            style={{ boxShadow: 'var(--shadow-sm)' }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {REGISTRY.length} biomarkers across {groupedRegistry.size} categories
          </p>
          <button
            onClick={() => {
              if (anyCollapsed) {
                expandAll();
              } else {
                collapseAll(Array.from(filteredGroups.keys()));
              }
            }}
            className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
          >
            {anyCollapsed ? "Expand All" : "Collapse All"}
          </button>
        </div>
      </div>

      {/* Registry browser */}
      <div className="flex-1 overflow-auto">
        {Array.from(filteredGroups.entries()).map(([category, entries]) => (
          <div key={category}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-5 py-2.5 bg-[var(--color-surface-tertiary)]/80 backdrop-blur-sm border-b border-[var(--color-border-light)] text-left hover:bg-[var(--color-surface-tertiary)] transition-colors sticky top-0 z-10"
            >
              <svg
                className={`w-3 h-3 text-[var(--color-text-tertiary)] transition-transform duration-200 ${isCollapsed(category) ? '' : 'rotate-90'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                {category}
              </span>
              <span className="text-xs text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full font-medium">
                {entries.length}
              </span>
            </button>

            {/* Biomarker rows */}
            {!isCollapsed(category) && (
              <div className="divide-y divide-[var(--color-border-light)]">
                {entries.map((entry) => {
                  const latest = getLatestValue(entry.slug);

                  return (
                    <button
                      key={entry.slug}
                      onClick={() => setActiveBiomarkerSlug(entry.slug)}
                      className="w-full flex items-center gap-4 px-5 py-2.5 text-left hover:bg-[var(--color-primary-light)] transition-colors duration-150"
                    >
                      <span className="text-sm text-[var(--color-text-primary)] flex-1 min-w-0">
                        {entry.displayName}
                        {entry.fullName !== entry.displayName && (
                          <span className="text-xs text-[var(--color-text-tertiary)] ml-1.5">
                            {entry.fullName}
                          </span>
                        )}
                        {entry.region && (
                          <span className="text-xs text-[var(--color-text-tertiary)] ml-1">
                            ({entry.region})
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)] w-24 text-right flex-shrink-0 tabular-nums">
                        {latest
                          ? latest.valueText ??
                            (latest.value !== null
                              ? String(latest.value)
                              : "\u2014")
                          : "\u2014"}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)] w-16 text-right flex-shrink-0">
                        {entry.defaultUnit || ""}
                      </span>
                      <span className="flex-shrink-0 w-24 text-right">
                        {latest && <FlagBadge flag={latest.flag} />}
                      </span>
                      <svg className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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

export function BiomarkersTab() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggle: toggleCategory, isCollapsed } = useCategoryCollapse();
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
          referenceRangeLow: b.referenceRangeLow,
          referenceRangeHigh: b.referenceRangeHigh,
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

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-5 py-3 border-b bg-white flex-shrink-0">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {REGISTRY.length} biomarkers across {groupedRegistry.size} categories
        </p>
      </div>

      {/* Registry browser */}
      <div className="flex-1 overflow-auto">
        {Array.from(filteredGroups.entries()).map(([category, entries]) => (
          <div key={category}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-5 py-2.5 bg-gray-50 border-b text-left hover:bg-gray-100 transition-colors sticky top-0 z-10"
            >
              <span className="w-3 text-xs text-gray-400">
                {isCollapsed(category) ? "\u25B6" : "\u25BC"}
              </span>
              <span className="font-semibold text-sm text-gray-900">
                {category}
              </span>
              <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                {entries.length}
              </span>
            </button>

            {/* Biomarker rows */}
            {!isCollapsed(category) && (
              <div className="divide-y divide-gray-50">
                {entries.map((entry) => {
                  const latest = getLatestValue(entry.slug);

                  return (
                    <Link
                      key={entry.slug}
                      href={`/biomarkers/${entry.slug}`}
                      className="flex items-center gap-4 px-5 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-900 flex-1 min-w-0">
                        {entry.displayName}
                        {entry.fullName !== entry.displayName && (
                          <span className="text-xs text-gray-400 ml-1.5">
                            {entry.fullName}
                          </span>
                        )}
                        {entry.region && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({entry.region})
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-gray-600 w-24 text-right flex-shrink-0">
                        {latest
                          ? latest.valueText ??
                            (latest.value !== null
                              ? String(latest.value)
                              : "\u2014")
                          : "\u2014"}
                      </span>
                      <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">
                        {entry.defaultUnit || ""}
                      </span>
                      <span className="flex-shrink-0 w-24 text-right">
                        {latest && <FlagBadge flag={latest.flag} />}
                      </span>
                      <span className="w-3 text-xs text-gray-300 flex-shrink-0">
                        &#x203A;
                      </span>
                    </Link>
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

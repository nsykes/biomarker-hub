"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { BiomarkerDetailData } from "@/lib/types";
import {
  REGISTRY,
  CanonicalBiomarker,
  BiomarkerCategory,
  getDerivativeInfo,
} from "@/lib/biomarker-registry";
import {
  getSharedBiomarkerList,
  getSharedBiomarkerDetail,
} from "@/lib/db/actions";
import type { SharedBiomarkerSummary } from "@/lib/db/actions/doctor-shares";
import { FlagBadge } from "./FlagBadge";
import { PageSpinner } from "./Spinner";
import { useCategoryCollapse } from "@/hooks/useCategoryCollapse";
import { HistoryChart } from "./biomarker-detail/HistoryChart";
import { HistoryTable } from "./biomarker-detail/HistoryTable";
import { SharedPdfPreviewModal } from "./SharedPdfPreviewModal";

interface ShareViewProps {
  token: string;
  userName: string;
}

export function ShareView({ token, userName }: ShareViewProps) {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [summaries, setSummaries] = useState<SharedBiomarkerSummary[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const result = await getSharedBiomarkerList(token, password);
      if (result === null) {
        setError("Incorrect password");
      } else {
        setSummaries(result);
        setAuthenticated(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-secondary)]">
        <div className="w-full max-w-sm mx-auto p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {userName}&apos;s Biomarkers
            </h1>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-2">
              Enter the password to view biomarker data.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-base w-full text-center text-lg tracking-widest"
              autoFocus
            />
            {error && (
              <p className="text-sm text-[var(--color-error)] text-center">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={checking || !password.trim()}
              className="btn-primary w-full"
            >
              {checking ? "Checking..." : "Access Biomarkers"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <SharedBiomarkerBrowser
      token={token}
      password={password}
      userName={userName}
      summaries={summaries}
    />
  );
}

/* ── Authenticated biomarker browser ── */

interface SharedBiomarkerBrowserProps {
  token: string;
  password: string;
  userName: string;
  summaries: SharedBiomarkerSummary[];
}

function SharedBiomarkerBrowser({
  token,
  password,
  userName,
  summaries,
}: SharedBiomarkerBrowserProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    toggle: toggleCategory,
    isCollapsed,
    expandAll,
    collapseAll,
    anyCollapsed,
  } = useCategoryCollapse();

  const slugSet = useMemo(() => new Set(summaries.map((s) => s.slug)), [summaries]);
  const summaryMap = useMemo(() => {
    const map = new Map<string, SharedBiomarkerSummary>();
    for (const s of summaries) map.set(s.slug, s);
    return map;
  }, [summaries]);

  // Filter registry to only biomarkers the user has data for
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
      const matching = entries.filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.fullName.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          e.aliases.some((a: string) => a.toLowerCase().includes(q))
      );
      if (matching.length > 0) {
        filtered.set(cat, matching);
      }
    }
    return filtered;
  }, [groupedRegistry, searchQuery]);

  const biomarkerCount = useMemo(
    () => Array.from(groupedRegistry.values()).reduce((sum, arr) => sum + arr.length, 0),
    [groupedRegistry]
  );

  if (activeSlug) {
    return (
      <SharedDetailView
        token={token}
        password={password}
        slug={activeSlug}
        onBack={() => setActiveSlug(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border-light)] px-5 py-4">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {userName}&apos;s Biomarkers
        </h1>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
          Read-only view
        </p>
      </div>

      {/* Search */}
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
            style={{ boxShadow: "var(--shadow-sm)" }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {biomarkerCount} biomarkers across {groupedRegistry.size} categories
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

      {/* Biomarker list */}
      <div>
        {Array.from(filteredGroups.entries()).map(([category, entries]) => (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-5 py-2.5 bg-[var(--color-surface-tertiary)]/80 backdrop-blur-sm border-b border-[var(--color-border-light)] text-left hover:bg-[var(--color-surface-tertiary)] transition-colors sticky top-0 z-10"
            >
              <svg
                className={`w-3 h-3 text-[var(--color-text-tertiary)] transition-transform duration-200 ${isCollapsed(category) ? "" : "rotate-90"}`}
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
                      onClick={() => setActiveSlug(entry.slug)}
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
                        {summary
                          ? summary.latestValueText ??
                            (summary.latestValue !== null
                              ? String(summary.latestValue)
                              : "\u2014")
                          : "\u2014"}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)] w-16 text-right flex-shrink-0">
                        {entry.defaultUnit || ""}
                      </span>
                      <span className="flex-shrink-0 w-24 text-right">
                        {summary && (
                          <FlagBadge flag={summary.latestFlag as import("@/lib/types").BiomarkerFlag} />
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

/* ── Shared biomarker detail view ── */

interface SharedDetailViewProps {
  token: string;
  password: string;
  slug: string;
  onBack: () => void;
}

function SharedDetailView({ token, password, slug, onBack }: SharedDetailViewProps) {
  const [data, setData] = useState<BiomarkerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState<{ reportId: string; page: number | null } | null>(null);

  const loadData = useCallback(async () => {
    const result = await getSharedBiomarkerDetail(token, password, slug);
    setData(result);
    setLoading(false);
  }, [token, password, slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const derivativeInfo = getDerivativeInfo(data.slug);

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)]">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)] flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
          {data.displayName}
        </h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium flex-shrink-0">
          {data.category}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {data.displayName}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium">
              {data.category}
            </span>
            {data.defaultUnit && (
              <span className="text-sm text-[var(--color-text-tertiary)]">
                {data.defaultUnit}
              </span>
            )}
          </div>
          {data.fullName !== data.displayName && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {data.fullName}
            </p>
          )}
          {derivativeInfo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-calculated-bg)] rounded-xl border border-[var(--color-calculated-badge-bg)]">
              <svg className="w-4 h-4 text-[var(--color-calculated)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-[var(--color-calculated)]">
                Calculated as: {derivativeInfo.derivative.formulaDisplay}
              </span>
            </div>
          )}
        </div>

        {/* Summary */}
        {data.summary && (
          <section className="card p-5">
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {data.summary}
            </p>
          </section>
        )}

        {/* Chart */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            History
          </h2>
          <HistoryChart data={data} />
        </section>

        {/* Table */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            All Results ({data.history.length})
          </h2>
          {data.history.length > 0 ? (
            <HistoryTable
              history={data.history}
              slug={data.slug}
              defaultUnit={data.defaultUnit}
              onViewPdf={(reportId, page) => setPdfPreview({ reportId, page })}
            />
          ) : (
            <p className="text-sm text-[var(--color-text-tertiary)]">
              No results found.
            </p>
          )}
        </section>

        {/* Reference range (read-only) */}
        {data.referenceRange && (
          <section className="card p-5">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
              Reference Range
            </h2>
            <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
              {data.referenceRange.rangeLow !== null && (
                <span>Low: {data.referenceRange.rangeLow}</span>
              )}
              {data.referenceRange.rangeHigh !== null && (
                <span>High: {data.referenceRange.rangeHigh}</span>
              )}
              {data.referenceRange.unit && (
                <span>{data.referenceRange.unit}</span>
              )}
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Goal: {data.referenceRange.goalDirection}
              </span>
            </div>
          </section>
        )}
      </div>

      {pdfPreview && (
        <SharedPdfPreviewModal
          token={token}
          password={password}
          reportId={pdfPreview.reportId}
          page={pdfPreview.page}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  );
}

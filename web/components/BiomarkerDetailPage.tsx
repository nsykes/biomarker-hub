"use client";

import Link from "next/link";
import { BiomarkerDetailData } from "@/lib/types";
import { HistoryChart } from "./biomarker-detail/HistoryChart";
import { HistoryTable } from "./biomarker-detail/HistoryTable";
import { ReferenceRangeSection } from "./biomarker-detail/ReferenceRangeSection";

export function BiomarkerDetailPage({ data }: { data: BiomarkerDetailData }) {
  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border-light)] bg-white px-5 py-4">
        <Link
          href="/?tab=biomarkers"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Biomarkers
        </Link>
        <div className="mt-2">
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
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{data.fullName}</p>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Chart section */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            History
          </h2>
          <HistoryChart data={data} />
        </section>

        {/* History table */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            All Results ({data.history.length})
          </h2>
          {data.history.length > 0 ? (
            <HistoryTable
              history={data.history}
              slug={data.slug}
              defaultUnit={data.defaultUnit}
            />
          ) : (
            <p className="text-sm text-[var(--color-text-tertiary)]">
              No results found for this biomarker across your reports.
            </p>
          )}
        </section>

        {/* Reference range section */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            Reference Range
          </h2>
          <ReferenceRangeSection data={data} />
        </section>
      </div>
    </div>
  );
}

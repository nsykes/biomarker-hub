"use client";

import { useState } from "react";
import Link from "next/link";
import { BiomarkerDetailData, ReferenceRange } from "@/lib/types";
import { HistoryChart } from "./biomarker-detail/HistoryChart";
import { HistoryTable } from "./biomarker-detail/HistoryTable";
import { ReferenceRangeSection } from "./biomarker-detail/ReferenceRangeSection";

export function BiomarkerDetailPage({ data }: { data: BiomarkerDetailData }) {
  const [referenceRange, setReferenceRange] = useState<ReferenceRange | null>(data.referenceRange);
  const chartData = { ...data, referenceRange };

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)]">
      {/* Header — frosted glass */}
      <header className="flex items-center gap-4 border-b border-[var(--color-border-light)] bg-white/80 backdrop-blur-lg px-5 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Link href="/">
          <img src="/logo.svg" alt="Biomarker Hub" className="h-10" />
        </Link>
        <div>
          <Link
            href="/?tab=biomarkers"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Biomarkers
          </Link>
          <div className="mt-1">
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
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Chart section */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            History
          </h2>
          <HistoryChart data={chartData} />
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
          <ReferenceRangeSection data={data} slug={data.slug} defaultUnit={data.defaultUnit} referenceRange={referenceRange} onRangeChange={setReferenceRange} />
        </section>
      </div>
    </div>
  );
}

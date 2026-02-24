"use client";

import Link from "next/link";
import { BiomarkerDetailData } from "@/lib/types";
import { HistoryChart } from "./biomarker-detail/HistoryChart";
import { HistoryTable } from "./biomarker-detail/HistoryTable";
import { ReferenceRangeSection } from "./biomarker-detail/ReferenceRangeSection";

export function BiomarkerDetailPage({ data }: { data: BiomarkerDetailData }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white px-5 py-4">
        <Link
          href="/?tab=biomarkers"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; Biomarkers
        </Link>
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {data.displayName}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              {data.category}
            </span>
            {data.defaultUnit && (
              <span className="text-sm text-gray-400">
                {data.defaultUnit}
              </span>
            )}
          </div>
          {data.fullName !== data.displayName && (
            <p className="text-sm text-gray-500 mt-0.5">{data.fullName}</p>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-8">
        {/* Chart section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            History
          </h2>
          <HistoryChart data={data} />
        </section>

        {/* History table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            All Results ({data.history.length})
          </h2>
          {data.history.length > 0 ? (
            <HistoryTable
              history={data.history}
              slug={data.slug}
              defaultUnit={data.defaultUnit}
            />
          ) : (
            <p className="text-sm text-gray-400">
              No results found for this biomarker across your reports.
            </p>
          )}
        </section>

        {/* Reference range section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Reference Range
          </h2>
          <ReferenceRangeSection data={data} />
        </section>
      </div>
    </div>
  );
}

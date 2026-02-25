"use client";

import { useState, useEffect, useCallback } from "react";
import { BiomarkerDetailData, ReferenceRange } from "@/lib/types";
import { REGISTRY } from "@/lib/biomarker-registry";
import { getBiomarkerDetail, backfillReferenceRange } from "@/lib/db/actions";
import { HistoryChart } from "./biomarker-detail/HistoryChart";
import { HistoryTable } from "./biomarker-detail/HistoryTable";
import { ReferenceRangeSection } from "./biomarker-detail/ReferenceRangeSection";
import dynamic from "next/dynamic";
const PdfPreviewModal = dynamic(() => import("./PdfPreviewModal").then(m => m.PdfPreviewModal), { ssr: false });
import { PageSpinner } from "./Spinner";

/* ── Shared detail content (used by both inline view and standalone page) ── */

function DetailContent({ data }: { data: BiomarkerDetailData }) {
  const [referenceRange, setReferenceRange] = useState<ReferenceRange | null>(data.referenceRange);
  const [pdfPreview, setPdfPreview] = useState<{ reportId: string; page: number | null } | null>(null);
  const chartData = { ...data, referenceRange };

  return (
    <>
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Title section */}
        <div>
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
              onViewPdf={(reportId, page) => setPdfPreview({ reportId, page })}
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

      {pdfPreview && (
        <PdfPreviewModal
          reportId={pdfPreview.reportId}
          page={pdfPreview.page}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </>
  );
}

/* ── Inline detail view (rendered inside BiomarkersTab) ── */

interface BiomarkerDetailViewProps {
  slug: string;
  onBack: () => void;
}

export function BiomarkerDetailView({ slug, onBack }: BiomarkerDetailViewProps) {
  const [data, setData] = useState<BiomarkerDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const entry = REGISTRY.find((e) => e.slug === slug);
    if (!entry) {
      onBack();
      return;
    }

    const { history, referenceRange } = await getBiomarkerDetail(slug);
    const finalRange = referenceRange ?? (await backfillReferenceRange(slug));

    setData({
      slug: entry.slug,
      displayName: entry.displayName,
      fullName: entry.fullName,
      category: entry.category,
      defaultUnit: entry.defaultUnit,
      history,
      referenceRange: finalRange,
    });
    setLoading(false);
  }, [slug, onBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <PageSpinner />;
  }

  if (!data) return null;

  return (
    <div className="overflow-auto h-full">
      {/* Sub-header (DashboardView style) */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-light)] bg-white sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)] flex-shrink-0"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
          {data.displayName}
        </h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium flex-shrink-0">
          {data.category}
        </span>
      </div>

      <DetailContent data={data} />
    </div>
  );
}

/* ── Standalone page wrapper (used by /biomarkers/[slug] server page) ── */

export function BiomarkerDetailPage({ data }: { data: BiomarkerDetailData }) {
  return (
    <div className="min-h-screen overflow-auto bg-[var(--color-surface-secondary)]">
      <DetailContent data={data} />
    </div>
  );
}

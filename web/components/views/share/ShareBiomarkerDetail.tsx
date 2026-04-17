"use client";

import { useState, useEffect } from "react";
import { BiomarkerDetailData } from "@/lib/types";
import { getDerivativeInfo } from "@/lib/biomarker-registry";
import { getSharedBiomarkerDetail } from "@/lib/db/actions";
import { PageSpinner } from "@/components/Spinner";
import { HistoryChart } from "@/components/biomarker-detail/HistoryChart";
import { HistoryTable } from "@/components/biomarker-detail/HistoryTable";
import { SharedPdfPreviewModal } from "@/components/SharedPdfPreviewModal";

interface ShareBiomarkerDetailProps {
  token: string;
  password: string;
  slug: string;
  onBack: () => void;
}

export function ShareBiomarkerDetail({
  token,
  password,
  slug,
  onBack,
}: ShareBiomarkerDetailProps) {
  const [data, setData] = useState<BiomarkerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState<{
    reportId: string;
    page: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getSharedBiomarkerDetail(token, password, slug);
      if (cancelled) return;
      setData(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, password, slug]);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const derivativeInfo = getDerivativeInfo(data.slug);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--color-surface-secondary)]">
      <div className="flex items-center gap-2 md:gap-3 safe-pt px-3 md:px-5 pb-3 md:pb-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] sticky top-0 z-10">
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

      <div className="max-w-4xl mx-auto px-4 py-4 md:px-5 md:py-6 space-y-4 md:space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
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
              <svg
                className="w-4 h-4 text-[var(--color-calculated)] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-[var(--color-calculated)]">
                Calculated as: {derivativeInfo.derivative.formulaDisplay}
              </span>
            </div>
          )}
        </div>

        {data.summary && (
          <section className="card p-4 md:p-5">
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {data.summary}
            </p>
          </section>
        )}

        <section className="card p-4 md:p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            History
          </h2>
          <HistoryChart data={data} />
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            All Results ({data.history.length})
          </h2>
          {data.history.length > 0 ? (
            <HistoryTable
              history={data.history}
              slug={data.slug}
              defaultUnit={data.defaultUnit}
              onViewPdf={(reportId, page) =>
                setPdfPreview({ reportId, page })
              }
            />
          ) : (
            <p className="text-sm text-[var(--color-text-tertiary)]">
              No results found.
            </p>
          )}
        </section>

        {data.referenceRange && (
          <section className="card p-4 md:p-5">
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

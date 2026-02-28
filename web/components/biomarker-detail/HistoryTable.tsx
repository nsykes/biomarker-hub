"use client";

import { BiomarkerHistoryPoint } from "@/lib/types";
import { FlagBadge } from "../FlagBadge";
import { formatDate } from "@/lib/utils";
import { formatValue } from "./helpers";
import { convertToCanonical } from "@/lib/unit-conversions";

export function HistoryTable({
  history,
  slug,
  defaultUnit,
  onViewPdf,
}: {
  history: BiomarkerHistoryPoint[];
  slug: string;
  defaultUnit: string | null;
  onViewPdf: (reportId: string, page: number | null) => void;
}) {
  // Show newest first in the table
  const sorted = [...history].reverse();

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border-light)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-[var(--color-text-tertiary)] uppercase bg-[var(--color-surface-tertiary)]">
            <th className="text-left py-2.5 px-4 font-medium">Date</th>
            <th className="text-right py-2.5 px-4 font-medium">Value</th>
            <th className="text-right py-2.5 px-4 font-medium">Unit</th>
            <th className="text-left py-2.5 px-4 font-medium">Flag</th>
            <th className="text-left py-2.5 px-4 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((h, i) => {
            const c =
              h.value !== null
                ? convertToCanonical(slug, h.value, h.unit)
                : null;
            const converted = c?.converted ?? false;

            return (
              <tr
                key={i}
                onClick={h.isCalculated ? undefined : () => onViewPdf(h.reportId, h.page)}
                className={`border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)] transition-colors duration-150 ${h.isCalculated ? 'cursor-default' : 'hover:bg-[var(--color-primary-light)] cursor-pointer'}`}
              >
                <td className="py-2.5 px-4">
                  {formatDate(h.collectionDate)}
                </td>
                <td className="text-right py-2.5 px-4 tabular-nums">
                  {converted ? (
                    <>
                      {parseFloat(c!.value.toFixed(2))}
                      <span className="text-[var(--color-text-tertiary)] ml-1 text-xs">
                        ({formatValue(h)} {h.unit})
                      </span>
                    </>
                  ) : (
                    formatValue(h)
                  )}
                </td>
                <td className="text-right py-2.5 px-4 text-[var(--color-text-tertiary)]">
                  {(converted ? c!.unit : h.unit) || defaultUnit || "\u2014"}
                </td>
                <td className="py-2.5 px-4">
                  <FlagBadge flag={h.flag} />
                </td>
                <td className="py-2.5 px-4 truncate max-w-[200px]">
                  {h.isCalculated ? (
                    <span className="inline-flex items-center gap-1 text-[var(--color-calculated)] text-xs font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Calculated
                    </span>
                  ) : (
                    <>{h.labName ? `${h.labName}${h.source ? ` · ${h.source}` : ''}` : h.source || "\u2014"}</>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

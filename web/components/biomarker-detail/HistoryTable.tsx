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
}: {
  history: BiomarkerHistoryPoint[];
  slug: string;
  defaultUnit: string | null;
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
              <tr key={i} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)] transition-colors duration-150">
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
                <td className="py-2.5 px-4 truncate max-w-[250px]">
                  {h.labName || h.source || "\u2014"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

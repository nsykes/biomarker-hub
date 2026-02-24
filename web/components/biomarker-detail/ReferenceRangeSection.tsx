"use client";

import { BiomarkerDetailData } from "@/lib/types";
import { convertToCanonical } from "@/lib/unit-conversions";

/** Format a range as "< X", "> X", or "X – Y" depending on which bounds exist. */
function formatRange(low: number | null, high: number | null): string {
  if (low !== null && high !== null) return `${low} – ${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return "\u2014";
}

const GOAL_BADGE_COLORS: Record<string, string> = {
  within: "bg-[#E8FAF0] text-[#1B7F37]",
  below: "bg-[#E8F4FD] text-[#0A84FF]",
  above: "bg-[#FFF3E0] text-[#B36B00]",
};

export function ReferenceRangeSection({ data }: { data: BiomarkerDetailData }) {
  // Collect lab-reported ranges, normalizing to canonical unit
  const labRanges = data.history
    .filter((h) => h.referenceRangeLow !== null || h.referenceRangeHigh !== null)
    .map((h) => {
      const low =
        h.referenceRangeLow !== null
          ? convertToCanonical(data.slug, h.referenceRangeLow, h.unit)
          : null;
      const high =
        h.referenceRangeHigh !== null
          ? convertToCanonical(data.slug, h.referenceRangeHigh, h.unit)
          : null;
      return {
        low: low ? parseFloat(low.value.toFixed(2)) : null,
        high: high ? parseFloat(high.value.toFixed(2)) : null,
        filename: h.filename,
        labName: h.labName,
      };
    });

  // Deduplicate by normalized low/high
  const uniqueLabRanges = labRanges.filter(
    (r, i, arr) =>
      arr.findIndex((o) => o.low === r.low && o.high === r.high) === i
  );

  return (
    <div className="space-y-4">
      {data.referenceRange ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {formatRange(data.referenceRange.rangeLow, data.referenceRange.rangeHigh)}
            {data.referenceRange.unit ? ` ${data.referenceRange.unit}` : ""}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GOAL_BADGE_COLORS[data.referenceRange.goalDirection] || "bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]"}`}>
            Goal: {data.referenceRange.goalDirection}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            No custom reference range set
          </p>
          <button
            disabled
            className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-tertiary)] cursor-not-allowed"
          >
            Edit
          </button>
        </div>
      )}

      {uniqueLabRanges.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-2">
            Lab-reported ranges
          </h4>
          <div className="space-y-1.5">
            {uniqueLabRanges.map((r, i) => (
              <div key={i} className="text-xs text-[var(--color-text-secondary)] flex gap-3 items-center pl-3 border-l-2 border-[var(--color-primary)] py-0.5">
                <span className="font-medium">{formatRange(r.low, r.high)}</span>
                <span className="text-[var(--color-text-tertiary)]">
                  {r.labName || r.filename}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

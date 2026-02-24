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
    <div className="space-y-3">
      {data.referenceRange ? (
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">
            {formatRange(data.referenceRange.rangeLow, data.referenceRange.rangeHigh)}
            {data.referenceRange.unit ? ` ${data.referenceRange.unit}` : ""}
          </span>
          <span className="text-gray-500">
            (goal: {data.referenceRange.goalDirection})
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400">
            No custom reference range set
          </p>
          <button
            disabled
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-300 cursor-not-allowed"
          >
            Edit
          </button>
        </div>
      )}

      {uniqueLabRanges.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 uppercase mb-1.5">
            Lab-reported ranges
          </h4>
          <div className="space-y-1">
            {uniqueLabRanges.map((r, i) => (
              <div key={i} className="text-xs text-gray-500 flex gap-3">
                <span>{formatRange(r.low, r.high)}</span>
                <span className="text-gray-400">
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

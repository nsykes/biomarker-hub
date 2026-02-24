"use client";

import { BiomarkerDetailData } from "@/lib/types";

export function ReferenceRangeSection({ data }: { data: BiomarkerDetailData }) {
  // Collect unique lab-reported ranges from history
  const labRanges = data.history
    .filter((h) => h.referenceRangeLow !== null || h.referenceRangeHigh !== null)
    .map((h) => ({
      low: h.referenceRangeLow,
      high: h.referenceRangeHigh,
      filename: h.filename,
      labName: h.labName,
    }));

  // Deduplicate by low/high
  const uniqueLabRanges = labRanges.filter(
    (r, i, arr) =>
      arr.findIndex((o) => o.low === r.low && o.high === r.high) === i
  );

  return (
    <div className="space-y-3">
      {data.referenceRange ? (
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-500">Low:</span>{" "}
            <span className="font-medium">
              {data.referenceRange.rangeLow ?? "\u2014"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">High:</span>{" "}
            <span className="font-medium">
              {data.referenceRange.rangeHigh ?? "\u2014"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Goal:</span>{" "}
            <span className="font-medium capitalize">
              {data.referenceRange.goalDirection}
            </span>
          </div>
          {data.referenceRange.unit && (
            <div>
              <span className="text-gray-500">Unit:</span>{" "}
              <span className="font-medium">{data.referenceRange.unit}</span>
            </div>
          )}
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
                <span>
                  {r.low ?? "?"} – {r.high ?? "?"}
                </span>
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

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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase border-b">
            <th className="text-left py-2 pr-4 font-medium">Date</th>
            <th className="text-right py-2 pr-4 font-medium">Value</th>
            <th className="text-right py-2 pr-4 font-medium">Unit</th>
            <th className="text-left py-2 pr-4 font-medium">Flag</th>
            <th className="text-left py-2 font-medium">Source</th>
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
              <tr key={i} className="border-b border-gray-50 text-gray-700">
                <td className="py-2 pr-4">
                  {formatDate(h.collectionDate)}
                </td>
                <td className="text-right py-2 pr-4 tabular-nums">
                  {converted ? (
                    <>
                      {parseFloat(c!.value.toFixed(2))}
                      <span className="text-gray-400 ml-1 text-xs">
                        ({formatValue(h)} {h.unit})
                      </span>
                    </>
                  ) : (
                    formatValue(h)
                  )}
                </td>
                <td className="text-right py-2 pr-4 text-gray-500">
                  {(converted ? c!.unit : h.unit) || defaultUnit || "\u2014"}
                </td>
                <td className="py-2 pr-4">
                  <FlagBadge flag={h.flag} />
                </td>
                <td className="py-2 truncate max-w-[250px]">
                  <span>{h.filename}</span>
                  {h.labName && (
                    <span className="text-gray-400 ml-1">
                      ({h.labName})
                    </span>
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

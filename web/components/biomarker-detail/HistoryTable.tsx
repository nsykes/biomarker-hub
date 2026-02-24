"use client";

import { BiomarkerHistoryPoint } from "@/lib/types";
import { FlagBadge } from "../FlagBadge";
import { formatDate } from "@/lib/utils";
import { formatValue } from "./helpers";

export function HistoryTable({ history }: { history: BiomarkerHistoryPoint[] }) {
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
          {sorted.map((h, i) => (
            <tr key={i} className="border-b border-gray-50 text-gray-700">
              <td className="py-2 pr-4">
                {formatDate(h.collectionDate)}
              </td>
              <td className="text-right py-2 pr-4 tabular-nums">
                {formatValue(h)}
              </td>
              <td className="text-right py-2 pr-4 text-gray-500">
                {h.unit || "\u2014"}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

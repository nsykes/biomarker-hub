"use client";

import { useState } from "react";
import { ReferenceRangeConflict } from "@/lib/types";
import { updateReferenceRange } from "@/lib/db/actions";

interface RangeConflictModalProps {
  conflicts: ReferenceRangeConflict[];
  onClose: () => void;
}

function formatRange(low: number | null, high: number | null, unit: string | null): string {
  const parts = [low, high].filter((v) => v !== null);
  const range = parts.length === 2 ? `${parts[0]} - ${parts[1]}` : parts.length === 1 ? String(parts[0]) : "-";
  return unit ? `${range} ${unit}` : range;
}

export function RangeConflictModal({ conflicts, onClose }: RangeConflictModalProps) {
  const [choices, setChoices] = useState<Record<string, "stored" | "pdf">>(
    () => Object.fromEntries(conflicts.map((c) => [c.slug, "stored"]))
  );
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const updates = conflicts.filter((c) => choices[c.slug] === "pdf");
      await Promise.all(
        updates.map((c) =>
          updateReferenceRange(c.slug, c.pdf.low, c.pdf.high, c.pdf.unit)
        )
      );
      onClose();
    } catch (err) {
      console.error("Failed to update reference ranges:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Reference Range Conflicts</h2>
          <p className="text-sm text-gray-500 mt-1">
            The PDF contains reference ranges that differ from your stored values.
            Choose which to keep for each biomarker.
          </p>
        </div>

        <div className="flex-1 overflow-auto px-5 py-3 space-y-3">
          {conflicts.map((c) => (
            <div key={c.slug} className="border rounded-lg p-3">
              <div className="font-medium text-sm mb-2">{c.metricName}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setChoices((prev) => ({ ...prev, [c.slug]: "stored" }))}
                  className={`flex-1 text-left px-3 py-2 rounded border text-xs transition-colors cursor-pointer ${
                    choices[c.slug] === "stored"
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium mb-0.5">Keep stored</div>
                  <div className="text-gray-600">{formatRange(c.stored.low, c.stored.high, c.stored.unit)}</div>
                </button>
                <button
                  onClick={() => setChoices((prev) => ({ ...prev, [c.slug]: "pdf" }))}
                  className={`flex-1 text-left px-3 py-2 rounded border text-xs transition-colors cursor-pointer ${
                    choices[c.slug] === "pdf"
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium mb-0.5">Use PDF range</div>
                  <div className="text-gray-600">{formatRange(c.pdf.low, c.pdf.high, c.pdf.unit)}</div>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

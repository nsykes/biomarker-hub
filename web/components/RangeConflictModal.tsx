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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col" style={{ boxShadow: 'var(--color-modal-shadow)' }}>
        <div className="px-5 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Reference Range Conflicts</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              The PDF contains reference ranges that differ from your stored values.
              Choose which to keep for each biomarker.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)] flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-3 space-y-3">
          {conflicts.map((c) => (
            <div key={c.slug} className="rounded-xl border border-[var(--color-border-light)] p-3">
              <div className="font-medium text-sm mb-2 text-[var(--color-text-primary)]">{c.metricName}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setChoices((prev) => ({ ...prev, [c.slug]: "stored" }))}
                  className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                    choices[c.slug] === "stored"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "border-[var(--color-border-light)] hover:border-[var(--color-border)]"
                  }`}
                >
                  <div className="font-medium mb-0.5">Keep stored</div>
                  <div className="text-[var(--color-text-secondary)]">{formatRange(c.stored.low, c.stored.high, c.stored.unit)}</div>
                </button>
                <button
                  onClick={() => setChoices((prev) => ({ ...prev, [c.slug]: "pdf" }))}
                  className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                    choices[c.slug] === "pdf"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "border-[var(--color-border-light)] hover:border-[var(--color-border)]"
                  }`}
                >
                  <div className="font-medium mb-0.5">Use PDF range</div>
                  <div className="text-[var(--color-text-secondary)]">{formatRange(c.pdf.low, c.pdf.high, c.pdf.unit)}</div>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[var(--color-border-light)] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { BiomarkerDetailData, ReferenceRange } from "@/lib/types";
import { convertToCanonical } from "@/lib/unit-conversions";
import { updateReferenceRange } from "@/lib/db/actions";

/** Format a range as "< X", "> X", or "X – Y" depending on which bounds exist. */
function formatRange(low: number | null, high: number | null): string {
  if (low !== null && high !== null) return `${low} – ${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return "\u2014";
}

function inferGoalDirection(
  low: number | null,
  high: number | null
): "below" | "above" | "within" {
  if (low !== null && high !== null) return "within";
  if (high !== null) return "below";
  if (low !== null) return "above";
  return "within";
}

const GOAL_BADGE_COLORS: Record<string, string> = {
  within: "bg-[#E8FAF0] text-[#1B7F37]",
  below: "bg-[#E8F4FD] text-[#0A84FF]",
  above: "bg-[#FFF3E0] text-[#B36B00]",
};

interface ReferenceRangeSectionProps {
  data: BiomarkerDetailData;
  slug: string;
  defaultUnit: string | null;
}

export function ReferenceRangeSection({ data, slug, defaultUnit }: ReferenceRangeSectionProps) {
  const [referenceRange, setReferenceRange] = useState<ReferenceRange | null>(data.referenceRange);
  const [editing, setEditing] = useState(false);
  const [rangeLow, setRangeLow] = useState("");
  const [rangeHigh, setRangeHigh] = useState("");
  const [unit, setUnit] = useState(defaultUnit || "");
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setRangeLow(referenceRange?.rangeLow !== null && referenceRange?.rangeLow !== undefined ? String(referenceRange.rangeLow) : "");
    setRangeHigh(referenceRange?.rangeHigh !== null && referenceRange?.rangeHigh !== undefined ? String(referenceRange.rangeHigh) : "");
    setUnit(referenceRange?.unit || defaultUnit || "");
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const low = rangeLow.trim() === "" ? null : parseFloat(rangeLow);
      const high = rangeHigh.trim() === "" ? null : parseFloat(rangeHigh);
      const unitVal = unit.trim() || null;

      if (low === null && high === null) {
        // Clear the range
        await updateReferenceRange(slug, null, null, unitVal);
        setReferenceRange(null);
      } else {
        await updateReferenceRange(slug, low, high, unitVal);
        setReferenceRange({
          rangeLow: low,
          rangeHigh: high,
          goalDirection: inferGoalDirection(low, high),
          unit: unitVal,
        });
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

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
      {editing ? (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Low</span>
              <input
                type="number"
                step="any"
                value={rangeLow}
                onChange={(e) => setRangeLow(e.target.value)}
                placeholder="—"
                className="input-base !w-24"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">High</span>
              <input
                type="number"
                step="any"
                value={rangeHigh}
                onChange={(e) => setRangeHigh(e.target.value)}
                placeholder="—"
                className="input-base !w-24"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Unit</span>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit"
                className="input-base !w-28"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={cancel} disabled={saving} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : referenceRange ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {formatRange(referenceRange.rangeLow, referenceRange.rangeHigh)}
            {referenceRange.unit ? ` ${referenceRange.unit}` : ""}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GOAL_BADGE_COLORS[referenceRange.goalDirection] || "bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]"}`}>
            Goal: {referenceRange.goalDirection}
          </span>
          <button
            onClick={startEditing}
            className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            No custom reference range set
          </p>
          <button
            onClick={startEditing}
            className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors"
          >
            Set Range
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

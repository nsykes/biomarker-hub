"use client";

import { useState } from "react";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { CanonicalBiomarker } from "@/lib/biomarker-registry";
import { Spinner } from "./Spinner";
import { GoalRow } from "@/lib/types";
import { MobileSheet } from "./MobileSheet";

interface CreateGoalModalProps {
  onSubmit: (canonicalSlug: string, targetValue: number) => Promise<void>;
  onClose: () => void;
  /** For edit mode — pre-fills biomarker and target */
  editGoal?: GoalRow & { displayName: string; defaultUnit: string | null };
}

export function CreateGoalModal({
  onSubmit,
  onClose,
  editGoal,
}: CreateGoalModalProps) {
  const [selected, setSelected] = useState<{
    slug: string;
    displayName: string;
    defaultUnit: string | null;
  } | null>(
    editGoal
      ? {
          slug: editGoal.canonicalSlug,
          displayName: editGoal.displayName,
          defaultUnit: editGoal.defaultUnit,
        }
      : null
  );
  const [targetValue, setTargetValue] = useState(
    editGoal ? String(editGoal.targetValue) : ""
  );
  const [showCombobox, setShowCombobox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editGoal;

  const handleSelect = (entry: CanonicalBiomarker) => {
    setSelected({
      slug: entry.slug,
      displayName: entry.displayName,
      defaultUnit: entry.defaultUnit,
    });
    setShowCombobox(false);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const val = parseFloat(targetValue);
    if (isNaN(val)) {
      setError("Please enter a valid number");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(selected.slug, val);
      onClose();
    } catch {
      setError("Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileSheet onClose={onClose} desktopMaxWidth="max-w-md" closeOnOverlayClick={false}>
      <div className="p-5 md:p-6 overflow-auto">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
          {isEdit ? "Edit Goal" : "New Goal"}
        </h2>

        {/* Biomarker selection */}
        {isEdit ? (
          <div className="mb-4">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Biomarker
            </label>
            <div className="px-3 py-2 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border-light)] text-sm text-[var(--color-text-primary)]">
              {selected?.displayName}
              {selected?.defaultUnit && (
                <span className="text-[var(--color-text-tertiary)] ml-1">
                  ({selected.defaultUnit})
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Biomarker
            </label>
            {selected ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border-light)] text-sm text-[var(--color-text-primary)]">
                  {selected.displayName}
                  {selected.defaultUnit && (
                    <span className="text-[var(--color-text-tertiary)] ml-1">
                      ({selected.defaultUnit})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    setShowCombobox(true);
                  }}
                  className="text-xs text-[var(--color-primary)] hover:underline flex-shrink-0"
                >
                  Change
                </button>
              </div>
            ) : showCombobox ? (
              <BiomarkerCombobox
                onSelect={handleSelect}
                onClose={() => setShowCombobox(false)}
                inline
                filter={(e) => e.defaultUnit !== null}
              />
            ) : (
              <button
                onClick={() => setShowCombobox(true)}
                className="w-full px-3 py-2 rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                + Select a biomarker
              </button>
            )}
          </div>
        )}

        {/* Target value input */}
        {selected && (
          <div className="mb-4">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Target value
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 70"
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border-light)] text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                autoFocus={isEdit}
              />
              {selected.defaultUnit && (
                <span className="text-sm text-[var(--color-text-tertiary)] flex-shrink-0">
                  {selected.defaultUnit}
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-[var(--color-error)] mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || !targetValue || saving}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Spinner size="sm" />}
            {isEdit ? "Update Goal" : "Create Goal"}
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}

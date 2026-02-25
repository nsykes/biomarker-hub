"use client";

import { useState } from "react";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { CanonicalBiomarker } from "@/lib/biomarker-registry";
import { Spinner } from "./Spinner";

interface CreateDashboardModalProps {
  onSubmit: (name: string, slugs: string[]) => Promise<void>;
  onClose: () => void;
  /** Pre-fill for edit mode */
  initialName?: string;
  initialSlugs?: string[];
}

export function CreateDashboardModal({
  onSubmit,
  onClose,
  initialName = "",
  initialSlugs = [],
}: CreateDashboardModalProps) {
  const [name, setName] = useState(initialName);
  const [slugs, setSlugs] = useState<{ slug: string; displayName: string }[]>(
    () =>
      initialSlugs.map((s) => ({
        slug: s,
        displayName: s,
      }))
  );
  const [showCombobox, setShowCombobox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialName;

  const handleSelect = (entry: CanonicalBiomarker) => {
    if (slugs.some((s) => s.slug === entry.slug)) {
      setShowCombobox(false);
      return;
    }
    setSlugs((prev) => [
      ...prev,
      { slug: entry.slug, displayName: entry.displayName },
    ]);
    setShowCombobox(false);
  };

  const handleRemove = (slug: string) => {
    setSlugs((prev) => prev.filter((s) => s.slug !== slug));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        name.trim(),
        slugs.map((s) => s.slug)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save dashboard");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 flex flex-col max-h-[80vh]"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {isEdit ? "Edit Dashboard" : "Create Dashboard"}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)] flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-auto flex-1">
          {/* Name input */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">
              Dashboard name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="e.g., Heart Health"
              className="input-base rounded-xl"
              autoFocus
            />
          </div>

          {/* Biomarker chips */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">
              Biomarkers
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {slugs.map((s) => (
                <span
                  key={s.slug}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-sm font-medium"
                >
                  {s.displayName}
                  <button
                    onClick={() => handleRemove(s.slug)}
                    disabled={saving}
                    className="hover:text-[var(--color-primary-hover)] transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              {slugs.length === 0 && !showCombobox && (
                <span className="text-sm text-[var(--color-text-tertiary)]">
                  No biomarkers added yet
                </span>
              )}
            </div>
            {showCombobox ? (
              <BiomarkerCombobox
                onSelect={handleSelect}
                onClose={() => setShowCombobox(false)}
              />
            ) : (
              <button
                onClick={() => setShowCombobox(true)}
                disabled={saving}
                className="btn-secondary text-sm"
              >
                + Add Biomarker
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-sm text-[#CC2D24] bg-[#FDE8E8]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border-light)] flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving && <Spinner size="sm" />}
            {saving
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

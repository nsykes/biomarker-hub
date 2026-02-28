"use client";

import { useState } from "react";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { CanonicalBiomarker, REGISTRY } from "@/lib/biomarker-registry";
import { Spinner } from "./Spinner";
import { DASHBOARD_TEMPLATES, DashboardTemplate } from "@/lib/constants";

interface CreateDashboardModalProps {
  onSubmit: (name: string, slugs: string[], groups?: string[][]) => Promise<void>;
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
  // Groups: each sub-array is a set of slugs that will share one chart
  const [groups, setGroups] = useState<string[][]>([]);
  const [selectedForGroup, setSelectedForGroup] = useState<Set<string>>(new Set());

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

  const applyTemplate = (template: DashboardTemplate) => {
    setName(template.name);
    setSlugs(
      template.slugs.map((slug) => {
        const entry = REGISTRY.find((e) => e.slug === slug);
        return { slug, displayName: entry?.displayName ?? slug };
      })
    );
  };

  const toggleChipSelect = (slug: string) => {
    setSelectedForGroup((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleGroupSelected = () => {
    if (selectedForGroup.size < 2) return;
    const groupSlugs = Array.from(selectedForGroup);
    // Remove these slugs from any existing groups first
    setGroups((prev) => {
      const cleaned = prev
        .map((g) => g.filter((s) => !groupSlugs.includes(s)))
        .filter((g) => g.length >= 2);
      return [...cleaned, groupSlugs];
    });
    setSelectedForGroup(new Set());
  };

  const handleUngroupSlug = (slug: string) => {
    setGroups((prev) =>
      prev
        .map((g) => g.filter((s) => s !== slug))
        .filter((g) => g.length >= 2)
    );
  };

  // Find which group a slug belongs to (if any)
  const getGroupIndex = (slug: string) =>
    groups.findIndex((g) => g.includes(slug));

  const GROUP_COLORS = [
    "var(--color-primary)",
    "#FF9500",
    "#34C759",
    "#AF52DE",
    "#FF2D55",
  ];

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        name.trim(),
        slugs.map((s) => s.slug),
        groups.length > 0 ? groups : undefined
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

          {/* Templates (create mode only) */}
          {!isEdit && (
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">
                Start from a template
              </label>
              <div className="flex flex-wrap gap-2">
                {DASHBOARD_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-full border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-50"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Biomarker chips */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">
              Biomarkers
              {slugs.length >= 2 && (
                <span className="text-xs text-[var(--color-text-tertiary)] font-normal ml-2">
                  Click chips to select, then group for overlay charts
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {slugs.map((s) => {
                const gi = getGroupIndex(s.slug);
                const isGrouped = gi !== -1;
                const isSelected = selectedForGroup.has(s.slug);
                const groupColor = isGrouped
                  ? GROUP_COLORS[gi % GROUP_COLORS.length]
                  : undefined;
                return (
                  <span
                    key={s.slug}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${
                      isSelected
                        ? "ring-2 ring-[var(--color-primary)] ring-offset-1"
                        : ""
                    } ${
                      !isGrouped
                        ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : ""
                    }`}
                    style={
                      isGrouped
                        ? {
                            backgroundColor: `color-mix(in srgb, ${groupColor} 15%, white)`,
                            color: groupColor,
                            borderLeft: `3px solid ${groupColor}`,
                          }
                        : undefined
                    }
                    onClick={() => toggleChipSelect(s.slug)}
                  >
                    {s.displayName}
                    {isGrouped && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUngroupSlug(s.slug);
                        }}
                        disabled={saving}
                        className="hover:opacity-70 transition-opacity"
                        title="Remove from group"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {!isGrouped && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(s.slug);
                        }}
                        disabled={saving}
                        className="hover:text-[var(--color-primary-hover)] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </span>
                );
              })}
              {slugs.length === 0 && !showCombobox && (
                <span className="text-sm text-[var(--color-text-tertiary)]">
                  No biomarkers added yet
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showCombobox ? (
                <BiomarkerCombobox
                  onSelect={handleSelect}
                  onClose={() => setShowCombobox(false)}
                  inline
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
              {selectedForGroup.size >= 2 && (
                <button
                  onClick={handleGroupSelected}
                  disabled={saving}
                  className="btn-secondary text-sm !border-[var(--color-primary)] !text-[var(--color-primary)]"
                >
                  Group {selectedForGroup.size} selected
                </button>
              )}
            </div>
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

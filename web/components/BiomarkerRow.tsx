"use client";

import { useState, useRef, useEffect } from "react";
import { Biomarker } from "@/lib/types";
import { FlagBadge } from "./FlagBadge";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { FLAG_OPTIONS } from "@/lib/constants";

interface BiomarkerRowProps {
  biomarker: Biomarker;
  isSelected: boolean;
  onSelect: (biomarker: Biomarker) => void;
  onUpdate: (id: string, field: keyof Biomarker, value: unknown) => void;
  onDelete: (id: string) => void;
}

export function BiomarkerRow({
  biomarker,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: BiomarkerRowProps) {
  const [editingField, setEditingField] = useState<keyof Biomarker | null>(
    null
  );
  const [editValue, setEditValue] = useState<string>("");
  const [showRemap, setShowRemap] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingField]);

  const startEdit = (
    e: React.MouseEvent,
    field: keyof Biomarker,
    currentValue: unknown
  ) => {
    e.stopPropagation();
    setEditingField(field);
    setEditValue(String(currentValue ?? ""));
  };

  const saveEdit = () => {
    if (!editingField) return;
    let typedValue: unknown = editValue;
    if (
      ["value", "referenceRangeLow", "referenceRangeHigh", "page"].includes(
        editingField
      )
    ) {
      typedValue = editValue === "" ? null : Number(editValue);
    }
    onUpdate(biomarker.id, editingField, typedValue);
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  const renderEditableCell = (
    field: keyof Biomarker,
    displayValue: string
  ) => {
    if (editingField === field) {
      if (field === "flag") {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement | null>}
            value={editValue}
            onChange={(e) => {
              onUpdate(biomarker.id, "flag", e.target.value);
              setEditingField(null);
            }}
            onBlur={cancelEdit}
            className="input-base !py-0.5 !px-1 !text-xs !rounded-lg"
          >
            {FLAG_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        );
      }
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement | null>}
          type={
            ["value", "referenceRangeLow", "referenceRangeHigh", "page"].includes(
              field
            )
              ? "number"
              : "text"
          }
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveEdit}
          step="any"
          className="input-base !py-0.5 !px-1 !text-xs !rounded-lg"
        />
      );
    }
    return (
      <span
        onClick={(e) => startEdit(e, field, displayValue)}
        className="cursor-text hover:bg-[var(--color-surface-tertiary)] px-1 py-0.5 rounded-md block min-h-[1.5em] transition-colors"
        title="Click to edit"
      >
        {displayValue || "\u00A0"}
      </span>
    );
  };

  const refRange =
    [biomarker.referenceRangeLow, biomarker.referenceRangeHigh]
      .filter((v) => v !== null)
      .join(" - ") || "-";

  const displayValue =
    biomarker.valueText ??
    (biomarker.value !== null ? String(biomarker.value) : "-");

  const isUnmatched = biomarker.canonicalSlug === null;

  return (
    <>
      <tr
        onClick={() => onSelect(biomarker)}
        className={`
          border-b border-[var(--color-border-light)] text-sm cursor-pointer transition-colors duration-150
          ${isSelected ? "bg-[var(--color-primary-light)] border-l-[3px] border-l-[var(--color-primary)]" : "hover:bg-[var(--color-surface-secondary)]"}
        `}
      >
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            {renderEditableCell("metricName", biomarker.metricName)}
            {isUnmatched && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRemap((v) => !v);
                }}
                className="shrink-0 text-[10px] font-medium text-[#B36B00] bg-[#FFF3E0] border border-[#FFE0B2] rounded-md px-1.5 py-0.5 hover:bg-[#FFE0B2] cursor-pointer transition-colors"
                title="This biomarker doesn't match any known entry. Click to remap."
              >
                Unmatched
              </button>
            )}
          </div>
        </td>
        <td className="px-2 py-1.5">
          {renderEditableCell("value", displayValue)}
        </td>
        <td className="px-2 py-1.5">
          {renderEditableCell("unit", biomarker.unit || "-")}
        </td>
        <td className="px-2 py-1.5">{refRange}</td>
        <td
          className="px-2 py-1.5"
          onClick={(e) => startEdit(e, "flag", biomarker.flag)}
        >
          {editingField === "flag" ? (
            renderEditableCell("flag", biomarker.flag)
          ) : (
            <FlagBadge flag={biomarker.flag} />
          )}
        </td>
        <td className="px-1 py-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(biomarker.id);
            }}
            className="text-[var(--color-text-tertiary)] hover:text-[#FF3B30] hover:bg-[#FDE8E8] rounded-md transition-colors p-1"
            title="Remove biomarker"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </td>
      </tr>
      {showRemap && (
        <tr className="border-b border-[var(--color-border-light)] bg-[#FFF3E0]/30">
          <td colSpan={6} className="px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)] shrink-0">Remap to:</span>
              <BiomarkerCombobox
                onSelect={(entry) => {
                  onUpdate(biomarker.id, "canonicalSlug", entry.slug);
                  onUpdate(biomarker.id, "metricName", entry.displayName);
                  onUpdate(biomarker.id, "category", entry.category);
                  if (!biomarker.unit) {
                    onUpdate(biomarker.id, "unit", entry.defaultUnit);
                  }
                  setShowRemap(false);
                }}
                onClose={() => setShowRemap(false)}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

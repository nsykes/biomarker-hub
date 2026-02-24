"use client";

import { useState, useRef, useEffect } from "react";
import { Biomarker } from "@/lib/types";
import { FlagBadge } from "./FlagBadge";
import { FLAG_OPTIONS } from "@/lib/constants";

interface BiomarkerRowProps {
  biomarker: Biomarker;
  isSelected: boolean;
  onSelect: (biomarker: Biomarker) => void;
  onUpdate: (id: string, field: keyof Biomarker, value: unknown) => void;
  onPageClick: (page: number) => void;
}

export function BiomarkerRow({
  biomarker,
  isSelected,
  onSelect,
  onUpdate,
  onPageClick,
}: BiomarkerRowProps) {
  const [editingField, setEditingField] = useState<keyof Biomarker | null>(
    null
  );
  const [editValue, setEditValue] = useState<string>("");
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
            className="w-full text-xs border rounded px-1 py-0.5"
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
          className="w-full text-xs border rounded px-1 py-0.5"
        />
      );
    }
    return (
      <span
        onClick={(e) => startEdit(e, field, displayValue)}
        className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded block min-h-[1.5em]"
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

  return (
    <tr
      onClick={() => onSelect(biomarker)}
      className={`
        border-b text-sm cursor-pointer transition-colors
        ${isSelected ? "bg-yellow-50 border-l-4 border-l-yellow-400" : "hover:bg-gray-50"}
      `}
    >
      <td className="px-2 py-1">
        {renderEditableCell("metricName", biomarker.metricName)}
      </td>
      <td className="px-2 py-1">
        {renderEditableCell("value", displayValue)}
      </td>
      <td className="px-2 py-1">
        {renderEditableCell("unit", biomarker.unit || "-")}
      </td>
      <td className="px-2 py-1">{refRange}</td>
      <td
        className="px-2 py-1"
        onClick={(e) => startEdit(e, "flag", biomarker.flag)}
      >
        {editingField === "flag" ? (
          renderEditableCell("flag", biomarker.flag)
        ) : (
          <FlagBadge flag={biomarker.flag} />
        )}
      </td>
      <td className="px-2 py-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPageClick(biomarker.page);
          }}
          className="text-blue-600 hover:underline text-xs"
        >
          p.{biomarker.page}
        </button>
      </td>
    </tr>
  );
}

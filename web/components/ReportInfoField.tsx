"use client";

import { useState, useRef, useEffect } from "react";

interface ReportInfoFieldProps {
  label: string;
  value: string;
  type: "text" | "date";
  onSave: (value: string) => void;
  size?: "sm" | "lg";
}

export function ReportInfoField({ label, value, type, onSave, size = "sm" }: ReportInfoFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const save = () => {
    onSave(editValue);
    setEditing(false);
  };

  const cancel = () => {
    setEditValue(value);
    setEditing(false);
  };

  const isLg = size === "lg";
  const valueClasses = isLg
    ? "text-base md:text-lg font-bold text-[var(--color-text-primary)] cursor-text hover:bg-[var(--color-primary-light)] px-1.5 py-0.5 rounded-md transition-colors"
    : "text-xs cursor-text hover:bg-[var(--color-primary-light)] px-1.5 py-0.5 rounded-md transition-colors";
  const inputClasses = isLg
    ? "input-base !py-0.5 !px-1.5 !text-base md:!text-lg !font-bold !w-auto !min-w-[140px] !rounded-lg"
    : "input-base !py-0.5 !px-1.5 !text-xs !w-auto !min-w-[80px] !rounded-lg";
  const placeholder = isLg ? "No date" : "\u2014";

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        {!isLg && <span className="text-[var(--color-text-secondary)] text-xs font-medium">{label}:</span>}
        <input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
          className={inputClasses}
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {!isLg && <span className="text-[var(--color-text-secondary)] text-xs font-medium">{label}:</span>}
      <span
        onClick={() => {
          setEditValue(value);
          setEditing(true);
        }}
        className={valueClasses}
        title={isLg ? `Click to edit ${label.toLowerCase()}` : "Click to edit"}
      >
        {value ? (isLg && type === "date" ? formatDateValue(value) : value) : placeholder}
      </span>
    </span>
  );
}

function formatDateValue(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

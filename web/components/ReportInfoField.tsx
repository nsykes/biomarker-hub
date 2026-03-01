"use client";

import { useState, useRef, useEffect } from "react";

interface ReportInfoFieldProps {
  label: string;
  value: string;
  type: "text" | "date";
  onSave: (value: string) => void;
}

export function ReportInfoField({ label, value, type, onSave }: ReportInfoFieldProps) {
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

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-[var(--color-text-secondary)] text-xs font-medium">{label}:</span>
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
          className="input-base !py-0.5 !px-1.5 !text-xs !w-auto !min-w-[80px] !rounded-lg"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--color-text-secondary)] text-xs font-medium">{label}:</span>
      <span
        onClick={() => {
          setEditValue(value);
          setEditing(true);
        }}
        className="text-xs cursor-text hover:bg-[var(--color-primary-light)] px-1.5 py-0.5 rounded-md transition-colors"
        title="Click to edit"
      >
        {value || "\u2014"}
      </span>
    </span>
  );
}

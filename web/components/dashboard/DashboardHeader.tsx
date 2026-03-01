"use client";

import { useState } from "react";

interface DashboardHeaderProps {
  name: string;
  onBack: () => void;
  onNameSave: (name: string) => void;
  onDelete: () => void;
  onAddClick: () => void;
  itemCount: number;
  mergeMode: boolean;
  onToggleMerge: () => void;
}

export function DashboardHeader({
  name,
  onBack,
  onNameSave,
  onDelete,
  onAddClick,
  itemCount,
  mergeMode,
  onToggleMerge,
}: DashboardHeaderProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(name);

  const save = () => {
    setEditingName(false);
    onNameSave(nameInput);
  };

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] sticky top-0 z-10">
      <button
        onClick={onBack}
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
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      {editingName ? (
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setNameInput(name);
              setEditingName(false);
            }
          }}
          className="input-base rounded-lg text-lg font-semibold !py-1 flex-1 max-w-xs"
          autoFocus
        />
      ) : (
        <button
          onClick={() => {
            setNameInput(name);
            setEditingName(true);
          }}
          className="text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors truncate"
          title="Click to rename"
        >
          {name}
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {itemCount >= 2 && (
          <button
            onClick={onToggleMerge}
            className={`btn-secondary text-sm ${mergeMode ? "!bg-[var(--color-primary-light)] !text-[var(--color-primary)] !border-[var(--color-primary)]" : ""}`}
          >
            {mergeMode ? "Cancel" : "Merge"}
          </button>
        )}
        <button
          onClick={onAddClick}
          className="btn-secondary text-sm"
        >
          + Add Biomarker
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-[var(--color-error-bg)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors"
          title="Delete dashboard"
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
              strokeWidth={1.5}
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

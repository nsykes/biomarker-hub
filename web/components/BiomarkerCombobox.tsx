"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { REGISTRY, CanonicalBiomarker } from "@/lib/biomarker-registry";

interface BiomarkerComboboxProps {
  onSelect: (entry: CanonicalBiomarker) => void;
  onClose: () => void;
}

export function BiomarkerCombobox({ onSelect, onClose }: BiomarkerComboboxProps) {
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return REGISTRY.slice(0, 30);
    const q = query.toLowerCase();
    return REGISTRY.filter((entry) => {
      if (entry.displayName.toLowerCase().includes(q)) return true;
      if (entry.fullName.toLowerCase().includes(q)) return true;
      return entry.aliases.some((a) => a.toLowerCase().includes(q));
    }).slice(0, 30);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        placeholder="Search biomarkers..."
        className="input-base rounded-xl"
      />
      {filtered.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full max-h-60 overflow-auto bg-white rounded-xl shadow-lg border border-[var(--color-border-light)]">
          {filtered.map((entry) => (
            <li
              key={entry.slug}
              onClick={() => onSelect(entry)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors flex justify-between items-baseline"
            >
              <span className="text-[var(--color-text-primary)]">{entry.displayName}</span>
              <span className="text-xs text-[var(--color-text-tertiary)] ml-2">{entry.category}</span>
            </li>
          ))}
        </ul>
      )}
      {filtered.length === 0 && query.trim() && (
        <div className="absolute z-20 mt-1.5 w-full bg-white rounded-xl shadow-lg border border-[var(--color-border-light)] px-3 py-3 text-sm text-[var(--color-text-tertiary)]">
          No matching biomarkers
        </div>
      )}
    </div>
  );
}

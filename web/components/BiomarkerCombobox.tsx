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
        className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border rounded shadow-lg">
          {filtered.map((entry) => (
            <li
              key={entry.slug}
              onClick={() => onSelect(entry)}
              className="px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 flex justify-between items-baseline"
            >
              <span>{entry.displayName}</span>
              <span className="text-xs text-gray-400 ml-2">{entry.category}</span>
            </li>
          ))}
        </ul>
      )}
      {filtered.length === 0 && query.trim() && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg px-3 py-2 text-sm text-gray-400">
          No matching biomarkers
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { Biomarker, ExtractionResult, ExtractionMeta } from "@/lib/types";
import { BiomarkerRow } from "./BiomarkerRow";
import { ModelSelector } from "./ModelSelector";
import { getDefaultModel } from "@/lib/models";

interface ResultsPanelProps {
  file: File | null;
  extraction: ExtractionResult | null;
  meta: ExtractionMeta | null;
  isExtracting: boolean;
  selectedBiomarker: Biomarker | null;
  onExtract: (model: string) => void;
  onSelectBiomarker: (biomarker: Biomarker) => void;
  onUpdateBiomarker: (id: string, field: keyof Biomarker, value: unknown) => void;
  onPageClick: (page: number) => void;
  defaultModel?: string;
}

export function ResultsPanel({
  file,
  extraction,
  meta,
  isExtracting,
  selectedBiomarker,
  onExtract,
  onSelectBiomarker,
  onUpdateBiomarker,
  onPageClick,
  defaultModel,
}: ResultsPanelProps) {
  const [model, setModel] = useState(defaultModel || getDefaultModel());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const groupedBiomarkers = useMemo(() => {
    if (!extraction) return new Map<string, Biomarker[]>();
    const groups = new Map<string, Biomarker[]>();
    for (const b of extraction.biomarkers) {
      const existing = groups.get(b.category) || [];
      existing.push(b);
      groups.set(b.category, existing);
    }
    return groups;
  }, [extraction]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleExport = () => {
    if (!extraction) return;
    const json = JSON.stringify(extraction, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biomarkers-${extraction.reportInfo.collectionDate}-${extraction.reportInfo.source}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b bg-gray-50 flex-shrink-0 flex-wrap">
        <ModelSelector
          value={model}
          onChange={setModel}
          disabled={isExtracting}
        />
        <button
          onClick={() => onExtract(model)}
          disabled={!file || isExtracting}
          className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {isExtracting && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isExtracting ? "Extracting..." : "Extract Biomarkers"}
        </button>
        {extraction && (
          <button
            onClick={handleExport}
            className="ml-auto px-3 py-1.5 border rounded text-sm hover:bg-gray-100"
          >
            Export JSON
          </button>
        )}
      </div>

      {/* Results table or empty state */}
      <div className="flex-1 overflow-auto">
        {!extraction && !isExtracting && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Upload a PDF and click Extract to begin</p>
          </div>
        )}

        {isExtracting && !extraction && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <span className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p>Extracting biomarkers... this may take 30-90 seconds</p>
          </div>
        )}

        {extraction && (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white border-b z-10">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="px-2 py-2">Metric</th>
                <th className="px-2 py-2">Value</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2">Ref Range</th>
                <th className="px-2 py-2">Flag</th>
                <th className="px-2 py-2">Page</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(groupedBiomarkers.entries()).map(
                ([category, biomarkers]) => (
                  <React.Fragment key={category}>
                    <tr
                      onClick={() => toggleCategory(category)}
                      className="bg-gray-100 cursor-pointer hover:bg-gray-200"
                    >
                      <td
                        colSpan={6}
                        className="px-2 py-1.5 font-semibold text-sm"
                      >
                        <span className="mr-1 inline-block w-3">
                          {collapsedCategories.has(category) ? "\u25B6" : "\u25BC"}
                        </span>
                        {category} ({biomarkers.length})
                      </td>
                    </tr>
                    {!collapsedCategories.has(category) &&
                      biomarkers.map((b) => (
                        <BiomarkerRow
                          key={b.id}
                          biomarker={b}
                          isSelected={selectedBiomarker?.id === b.id}
                          onSelect={onSelectBiomarker}
                          onUpdate={onUpdateBiomarker}
                          onPageClick={onPageClick}
                        />
                      ))}
                  </React.Fragment>
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      {meta && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-500 flex-shrink-0">
          <span>Model: {meta.model}</span>
          {meta.tokensUsed && (
            <span>Tokens: {meta.tokensUsed.toLocaleString()}</span>
          )}
          {meta.duration && (
            <span>Duration: {(meta.duration / 1000).toFixed(1)}s</span>
          )}
          {extraction && (
            <span>Biomarkers: {extraction.biomarkers.length}</span>
          )}
        </div>
      )}
    </div>
  );
}

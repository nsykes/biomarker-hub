"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Biomarker, ExtractionResult, ExtractionMeta } from "@/lib/types";
import { BiomarkerRow } from "./BiomarkerRow";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { Spinner } from "./Spinner";
import { useCategoryCollapse } from "@/hooks/useCategoryCollapse";

interface ResultsPanelProps {
  file: File | null;
  extraction: ExtractionResult | null;
  meta: ExtractionMeta | null;
  isExtracting: boolean;
  selectedBiomarker: Biomarker | null;
  onExtract: () => void;
  onSelectBiomarker: (biomarker: Biomarker) => void;
  onUpdateBiomarker: (id: string, field: keyof Biomarker, value: unknown) => void;
  onPageClick: (page: number) => void;
  onUpdateReportInfo: (field: string, value: string) => void;
  onDeleteBiomarker: (id: string) => void;
  onAddBiomarker: (biomarker: Biomarker) => void;
}

function ReportInfoField({
  label,
  value,
  type,
  onSave,
}: {
  label: string;
  value: string;
  type: "text" | "date";
  onSave: (value: string) => void;
}) {
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
        <span className="text-gray-500 text-xs font-medium">{label}:</span>
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
          className="border rounded px-1.5 py-0.5 text-xs w-auto min-w-[80px]"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-gray-500 text-xs font-medium">{label}:</span>
      <span
        onClick={() => {
          setEditValue(value);
          setEditing(true);
        }}
        className="text-xs cursor-text hover:bg-blue-100 px-1.5 py-0.5 rounded"
        title="Click to edit"
      >
        {value || "\u2014"}
      </span>
    </span>
  );
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
  onUpdateReportInfo,
  onDeleteBiomarker,
  onAddBiomarker,
}: ResultsPanelProps) {
  const { toggle: toggleCategory, isCollapsed } = useCategoryCollapse();
  const [showCombobox, setShowCombobox] = useState(false);

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
        <button
          onClick={() => onExtract()}
          disabled={!file || isExtracting}
          className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 cursor-pointer"
        >
          {isExtracting && (
            <Spinner size="sm" className="border-white border-t-transparent" />
          )}
          {isExtracting ? "Extracting..." : "Extract Biomarkers"}
        </button>
        {extraction && (
          <button
            onClick={handleExport}
            className="ml-auto px-3 py-1.5 border rounded text-sm hover:bg-gray-100 cursor-pointer"
          >
            Export JSON
          </button>
        )}
      </div>

      {/* Report info bar */}
      {extraction && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b bg-blue-50 flex-shrink-0 flex-wrap">
          <ReportInfoField
            label="Date"
            value={extraction.reportInfo.collectionDate || ""}
            type="date"
            onSave={(v) => onUpdateReportInfo("collectionDate", v)}
          />
          <ReportInfoField
            label="Source"
            value={extraction.reportInfo.source || ""}
            type="text"
            onSave={(v) => onUpdateReportInfo("source", v)}
          />
          <ReportInfoField
            label="Lab"
            value={extraction.reportInfo.labName || ""}
            type="text"
            onSave={(v) => onUpdateReportInfo("labName", v)}
          />
        </div>
      )}

      {/* Results table or empty state */}
      <div className="flex-1 overflow-auto">
        {!extraction && !isExtracting && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Upload a PDF and click Extract to begin</p>
          </div>
        )}

        {isExtracting && !extraction && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Spinner size="lg" className="border-blue-600 border-t-transparent" />
            <p>Extracting biomarkers... this may take 30-90 seconds</p>
          </div>
        )}

        {extraction && (
          <>
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b z-10">
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-2 py-2">Metric</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2">Unit</th>
                  <th className="px-2 py-2">Ref Range</th>
                  <th className="px-2 py-2">Flag</th>
                  <th className="px-2 py-2">Page</th>
                  <th className="px-1 py-2"></th>
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
                          colSpan={7}
                          className="px-2 py-1.5 font-semibold text-sm"
                        >
                          <span className="mr-1 inline-block w-3">
                            {isCollapsed(category) ? "\u25B6" : "\u25BC"}
                          </span>
                          {category} ({biomarkers.length})
                        </td>
                      </tr>
                      {!isCollapsed(category) &&
                        biomarkers.map((b) => (
                          <BiomarkerRow
                            key={b.id}
                            biomarker={b}
                            isSelected={selectedBiomarker?.id === b.id}
                            onSelect={onSelectBiomarker}
                            onUpdate={onUpdateBiomarker}
                            onPageClick={onPageClick}
                            onDelete={onDeleteBiomarker}
                          />
                        ))}
                    </React.Fragment>
                  )
                )}
              </tbody>
            </table>

            {/* Add Biomarker */}
            <div className="px-3 py-2 border-t">
              {showCombobox ? (
                <BiomarkerCombobox
                  onSelect={(entry) => {
                    const newBiomarker: Biomarker = {
                      id: crypto.randomUUID(),
                      category: entry.category,
                      metricName: entry.displayName,
                      rawName: entry.displayName,
                      value: null,
                      valueText: null,
                      valueModifier: null,
                      unit: entry.defaultUnit,
                      referenceRangeLow: null,
                      referenceRangeHigh: null,
                      flag: "NORMAL",
                      page: 0,
                      region: entry.region,
                      canonicalSlug: entry.slug,
                    };
                    onAddBiomarker(newBiomarker);
                    setShowCombobox(false);
                  }}
                  onClose={() => setShowCombobox(false)}
                />
              ) : (
                <button
                  onClick={() => setShowCombobox(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  + Add Biomarker
                </button>
              )}
            </div>
          </>
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

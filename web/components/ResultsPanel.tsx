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
  noApiKey: boolean;
  selectedBiomarker: Biomarker | null;
  onExtract: () => void;
  onSelectBiomarker: (biomarker: Biomarker) => void;
  onUpdateBiomarker: (id: string, field: keyof Biomarker, value: unknown) => void;
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

export function ResultsPanel({
  file,
  extraction,
  meta,
  isExtracting,
  noApiKey,
  selectedBiomarker,
  onExtract,
  onSelectBiomarker,
  onUpdateBiomarker,
  onUpdateReportInfo,
  onDeleteBiomarker,
  onAddBiomarker,
}: ResultsPanelProps) {
  const { toggle: toggleCategory, isCollapsed, expandAll, collapseAll, anyCollapsed } = useCategoryCollapse();
  const [showCombobox, setShowCombobox] = useState(false);

  const { groupedBiomarkers, calculatedBiomarkers } = useMemo(() => {
    if (!extraction) return { groupedBiomarkers: new Map<number, Biomarker[]>(), calculatedBiomarkers: [] as Biomarker[] };
    const groups = new Map<number, Biomarker[]>();
    const calc: Biomarker[] = [];
    for (const b of extraction.biomarkers) {
      if (b.isCalculated) {
        calc.push(b);
      } else {
        const existing = groups.get(b.page) || [];
        existing.push(b);
        groups.set(b.page, existing);
      }
    }
    return {
      groupedBiomarkers: new Map([...groups.entries()].sort(([a], [b]) => a - b)),
      calculatedBiomarkers: calc,
    };
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
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--color-border-light)] bg-white flex-shrink-0 flex-wrap" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <button
          onClick={() => {
            if (extraction && !isExtracting) {
              if (!window.confirm("Are you sure? This will re-run extraction.")) return;
            }
            onExtract();
          }}
          disabled={!file || isExtracting || noApiKey}
          className={
            extraction && !isExtracting
              ? "btn-secondary flex items-center gap-2"
              : "btn-primary flex items-center gap-2"
          }
        >
          {isExtracting && (
            <Spinner size="sm" className="!border-white !border-t-transparent" />
          )}
          {isExtracting
            ? "Extracting..."
            : extraction
              ? "Re-attempt Extraction"
              : "Extract Biomarkers"}
        </button>
        {noApiKey && (
          <span className="text-xs text-[#B36B00]">
            Add your OpenRouter API key in Settings to start extracting.
          </span>
        )}
        {extraction && (
          <button
            onClick={handleExport}
            className="ml-auto btn-secondary"
          >
            Export JSON
          </button>
        )}
      </div>

      {/* Report info bar */}
      {extraction && (
        <div className="flex items-center gap-4 px-3 py-2 border-b border-[var(--color-border-light)] bg-[var(--color-primary-light)] flex-shrink-0 flex-wrap">
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
          <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)]">
            <p>Upload a PDF and click Extract to begin</p>
          </div>
        )}

        {isExtracting && !extraction && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] gap-3">
            <Spinner size="lg" />
            <p>Extracting biomarkers... this may take 30-90 seconds</p>
          </div>
        )}

        {extraction && (
          <>
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b border-[var(--color-border-light)] z-10">
                <tr className="text-xs text-[var(--color-text-tertiary)] uppercase">
                  <th className="px-2 py-2">Metric</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2">Unit</th>
                  <th className="px-2 py-2">Ref Range</th>
                  <th className="px-2 py-2">Flag</th>
                  <th className="px-1 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from(groupedBiomarkers.entries()).map(
                  ([page, biomarkers]) => {
                    const key = String(page);
                    return (
                    <React.Fragment key={key}>
                      <tr
                        onClick={() => toggleCategory(key)}
                        className="bg-[var(--color-surface-tertiary)] cursor-pointer hover:bg-[var(--color-border-light)] transition-colors"
                      >
                        <td
                          colSpan={7}
                          className="px-2 py-1.5 font-semibold text-sm text-[var(--color-text-primary)]"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <svg
                              className={`w-3 h-3 text-[var(--color-text-tertiary)] transition-transform duration-200 ${isCollapsed(key) ? '' : 'rotate-90'}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Page {page} ({biomarkers.length})
                          </span>
                        </td>
                      </tr>
                      {!isCollapsed(key) &&
                        biomarkers.map((b) => (
                          <BiomarkerRow
                            key={b.id}
                            biomarker={b}
                            isSelected={selectedBiomarker?.id === b.id}
                            onSelect={onSelectBiomarker}
                            onUpdate={onUpdateBiomarker}
                            onDelete={onDeleteBiomarker}
                          />
                        ))}
                    </React.Fragment>
                    );
                  }
                )}
                {calculatedBiomarkers.length > 0 && (
                  <>
                    <tr
                      onClick={() => toggleCategory("calc")}
                      className="bg-[#F0F0FF] cursor-pointer hover:bg-[#E8E8F8] transition-colors"
                    >
                      <td
                        colSpan={7}
                        className="px-2 py-1.5 font-semibold text-sm text-[#5856D6]"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            className={`w-3 h-3 text-[#5856D6] transition-transform duration-200 ${isCollapsed("calc") ? '' : 'rotate-90'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Calculated Values ({calculatedBiomarkers.length})
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E8E8F8] text-[#5856D6] uppercase tracking-wider">
                            CALC
                          </span>
                        </span>
                      </td>
                    </tr>
                    {!isCollapsed("calc") &&
                      calculatedBiomarkers.map((b) => (
                        <BiomarkerRow
                          key={b.id}
                          biomarker={b}
                          isSelected={selectedBiomarker?.id === b.id}
                          onSelect={onSelectBiomarker}
                          onUpdate={onUpdateBiomarker}
                          onDelete={onDeleteBiomarker}
                        />
                      ))}
                  </>
                )}
              </tbody>
            </table>

            {/* Add Biomarker */}
            <div className="px-3 py-2.5 border-t border-[var(--color-border-light)]">
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
                  className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium cursor-pointer"
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
        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-[var(--color-border-light)] bg-[var(--color-surface-tertiary)] text-xs text-[var(--color-text-tertiary)] flex-shrink-0">
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

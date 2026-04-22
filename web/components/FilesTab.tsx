"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { StoredFile } from "@/lib/types";
import { getFiles, deleteFile } from "@/lib/db/actions";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "./Skeleton";
import { DatePickerInput } from "./DatePickerInput";

interface FilesTabProps {
  onNewExtraction: () => void;
  onViewFile: (file: StoredFile) => void;
}

const REPORT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  blood_panel: { label: "Blood", color: "bg-[var(--color-badge-blood-bg)] text-[var(--color-badge-blood-text)]" },
  dexa_scan: { label: "DEXA", color: "bg-[var(--color-badge-dexa-bg)] text-[var(--color-badge-dexa-text)]" },
  other: { label: "Other", color: "bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]" },
};

export function FilesTab({ onNewExtraction, onViewFile }: FilesTabProps) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [labFilter, setLabFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [collectionDateFrom, setCollectionDateFrom] = useState("");
  const [collectionDateTo, setCollectionDateTo] = useState("");


  const loadFiles = useCallback(async () => {
    try {
      const data = await getFiles();
      setFiles(data);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this file and its extraction data?")) return;
    setDeletingId(id);
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const uniqueLabs = useMemo(() => {
    const labs = new Set<string>();
    files.forEach((f) => { if (f.labName) labs.add(f.labName); });
    return Array.from(labs).sort();
  }, [files]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    files.forEach((f) => { if (f.source) sources.add(f.source); });
    return Array.from(sources).sort();
  }, [files]);

  const filteredFiles = useMemo(() => {
    const result = files.filter((f) => {
      if (typeFilter !== "all" && (f.reportType ?? "other") !== typeFilter) return false;
      if (labFilter !== "all" && (f.labName || "") !== labFilter) return false;
      if (sourceFilter !== "all" && (f.source || "") !== sourceFilter) return false;
      if (collectionDateFrom && (!f.collectionDate || f.collectionDate < collectionDateFrom)) return false;
      if (collectionDateTo && (!f.collectionDate || f.collectionDate > collectionDateTo)) return false;
      return true;
    });
    result.sort((a, b) => {
      if (!a.collectionDate && !b.collectionDate) return 0;
      if (!a.collectionDate) return 1;
      if (!b.collectionDate) return -1;
      return b.collectionDate.localeCompare(a.collectionDate);
    });
    return result;
  }, [files, typeFilter, labFilter, sourceFilter, collectionDateFrom, collectionDateTo]);

  const filtersActive = typeFilter !== "all" || labFilter !== "all" || sourceFilter !== "all" || collectionDateFrom || collectionDateTo;

  const clearFilters = () => {
    setTypeFilter("all");
    setLabFilter("all");
    setSourceFilter("all");
    setCollectionDateFrom("");
    setCollectionDateTo("");
  };

  if (loading) {
    return (
      <div className="relative h-full">
        <div className="overflow-auto h-full">
          <div className="flex flex-wrap gap-2 md:gap-4 items-end px-3 md:px-5 py-2 md:py-3 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="divide-y divide-[var(--color-border-light)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 md:px-5 py-3">
                <Skeleton className="h-4 w-48 flex-shrink-0" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] gap-5 p-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">No files yet</p>
          <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
            Upload a lab report PDF to get started
          </p>
        </div>
        <button
          onClick={onNewExtraction}
          className="btn-primary mt-1"
        >
          Upload PDF
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="overflow-auto h-full">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 md:gap-4 items-end px-3 md:px-5 py-2 md:py-3 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] sticky top-0 z-20">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-base !py-1.5 !px-2 !rounded-lg !w-auto"
            >
              <option value="all">All</option>
              <option value="blood_panel">Blood</option>
              <option value="dexa_scan">DEXA</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Lab</label>
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="input-base !py-1.5 !px-2 !rounded-lg !w-auto max-w-[9rem]"
            >
              <option value="all">All</option>
              {uniqueLabs.map((lab) => (
                <option key={lab} value={lab}>{lab}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="input-base !py-1.5 !px-2 !rounded-lg !w-auto max-w-[9rem]"
            >
              <option value="all">All</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Collection Date</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <DatePickerInput
                value={collectionDateFrom}
                onChange={setCollectionDateFrom}
                placeholder="From"
                maxDate={collectionDateTo || undefined}
              />
              <span className="text-[var(--color-text-tertiary)] text-xs">to</span>
              <DatePickerInput
                value={collectionDateTo}
                onChange={setCollectionDateTo}
                placeholder="To"
                minDate={collectionDateFrom || undefined}
              />
            </div>
          </div>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium py-1.5"
            >
              Clear filters
            </button>
          )}
        </div>
        {filtersActive && (
          <div className="px-4 md:px-5 py-1.5 text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface)] border-b border-[var(--color-border-light)]">
            Showing {filteredFiles.length} of {files.length} files
          </div>
        )}

        {/* Desktop: table. Mobile: card list */}
        <div className="m-3 md:m-4 pb-tab-bar">
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider bg-[var(--color-surface-tertiary)]">
                  <th className="px-5 py-3 font-medium">Report</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Lab</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Biomarkers</th>
                  <th className="px-5 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[var(--color-text-tertiary)] text-sm">
                      No files match filters
                    </td>
                  </tr>
                ) : null}
                {filteredFiles.map((f) => {
                  const badge = REPORT_TYPE_LABELS[f.reportType ?? "other"] ?? REPORT_TYPE_LABELS.other;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => onViewFile(f)}
                      className="hover:bg-[var(--color-primary-light)] cursor-pointer transition-colors duration-150"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <svg className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {f.collectionDate ? formatDate(f.collectionDate) : "No date"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--color-text-secondary)] truncate max-w-[200px]">
                        {f.labName || "\u2014"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--color-text-secondary)] truncate max-w-[200px]">
                        {f.source || "\u2014"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--color-text-secondary)]">
                        {f.biomarkers.length}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={(e) => handleDelete(e, f.id)}
                          disabled={deletingId === f.id}
                          className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded-lg transition-colors disabled:opacity-50"
                          title="Delete file"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <ul className="md:hidden flex flex-col gap-2">
            {filteredFiles.length === 0 && (
              <li className="text-center text-sm text-[var(--color-text-tertiary)] py-10">
                No files match filters
              </li>
            )}
            {filteredFiles.map((f) => {
              const badge = REPORT_TYPE_LABELS[f.reportType ?? "other"] ?? REPORT_TYPE_LABELS.other;
              return (
                <li key={f.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onViewFile(f)}
                    className="w-full text-left card px-4 py-3 pr-12 active:bg-[var(--color-primary-light)] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {f.collectionDate ? formatDate(f.collectionDate) : "No date"}
                      </span>
                      <span className={`flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--color-text-secondary)]">
                      <span className="truncate">
                        {f.labName || "\u2014"}{f.source ? ` · ${f.source}` : ""}
                      </span>
                      <span className="flex-shrink-0 text-[var(--color-text-tertiary)]">
                        {f.biomarkers.length} biomarkers
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, f.id)}
                    disabled={deletingId === f.id}
                    className="absolute top-2 right-2 p-1.5 text-[var(--color-text-tertiary)] rounded-lg transition-colors disabled:opacity-50 active:bg-[var(--color-error-bg)] active:text-[var(--color-error)]"
                    aria-label="Delete file"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* FAB button — sits above bottom tab bar on mobile */}
      <button
        onClick={onNewExtraction}
        className="fixed bottom-above-tab-bar right-4 md:right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #0A84FF, #0070E0)' }}
        title="New extraction"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { SplitPane } from "@/components/SplitPane";
import { ResultsPanel } from "@/components/ResultsPanel";
import { UploadZone } from "@/components/UploadZone";
import { Biomarker, HighlightTarget, StoredFile } from "@/lib/types";
import { buildHighlightTarget } from "@/lib/highlight";
import { formatDate } from "@/lib/utils";
import { RangeConflictModal } from "@/components/RangeConflictModal";
import { UndoToast } from "@/components/UndoToast";
import { validatePdfFile } from "@/lib/pdf-validation";
import { useExtractionState } from "@/hooks/useExtractionState";
import { useUndoDelete } from "@/hooks/useUndoDelete";

const PdfViewer = dynamic(
  () =>
    import("@/components/PdfViewer").then((mod) => ({
      default: mod.PdfViewer,
    })),
  { ssr: false }
);

interface ExtractionViewProps {
  mode: { type: "new" } | { type: "view"; file: StoredFile };
  onBack: () => void;
}

export function ExtractionView({ mode, onBack }: ExtractionViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBiomarker, setSelectedBiomarker] = useState<Biomarker | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget | null>(null);

  const {
    extraction,
    setExtraction,
    extractionRef,
    meta,
    setMeta,
    isExtracting,
    error,
    setError,
    savedFileId,
    setSavedFileId,
    apiKey,
    rangeConflicts,
    setRangeConflicts,
    handleExtract,
    handleUpdateReportInfo,
    handleUpdateBiomarker,
    handleAddBiomarker,
  } = useExtractionState(mode);

  const { toastItem, flushPendingDelete, handleDeleteBiomarker, handleUndo } =
    useUndoDelete(savedFileId, extractionRef, setExtraction);

  // Fetch stored PDF when viewing a report that has one
  const pdfFetched = useRef(false);
  useEffect(() => {
    if (mode.type !== "view" || !mode.file.pdfSizeBytes || pdfFetched.current) return;
    pdfFetched.current = true;
    fetch(`/api/reports/${mode.file.id}/pdf`)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (blob) setFile(new File([blob], mode.file.filename, { type: "application/pdf" }));
      })
      .catch(console.error);
  }, [mode]);

  const handleFileSelect = useCallback((f: File) => {
    const pdfErr = validatePdfFile(f);
    if (pdfErr) {
      setError(pdfErr.message);
      return;
    }
    setFile(f);
    setExtraction(null);
    setMeta(null);
    setSelectedBiomarker(null);
    setHighlightTarget(null);
    setCurrentPage(1);
    setError(null);
    setSavedFileId(null);
  }, [setExtraction, setMeta, setError, setSavedFileId]);

  // Re-attach PDF to existing report (view mode with missing PDF)
  const handleReUploadPdf = useCallback(
    async (f: File) => {
      if (!savedFileId) return;
      setFile(f);
      setCurrentPage(1);
      try {
        const res = await fetch(`/api/reports/${savedFileId}/pdf`, { method: "PUT", body: f });
        if (!res.ok) {
          const retry = await fetch(`/api/reports/${savedFileId}/pdf`, { method: "PUT", body: f });
          if (!retry.ok) {
            console.error("PDF re-upload failed after retry:", retry.status);
          }
        }
      } catch (err) {
        console.error("PDF re-upload failed:", err);
      }
    },
    [savedFileId]
  );

  const onExtract = useCallback(async () => {
    if (!file) return;
    setSelectedBiomarker(null);
    setHighlightTarget(null);
    await handleExtract(file);
  }, [file, handleExtract]);

  const handleSelectBiomarker = useCallback((biomarker: Biomarker) => {
    setSelectedBiomarker(biomarker);
    setHighlightTarget(buildHighlightTarget(biomarker));
  }, []);

  const isViewMode = mode.type === "view" && !file;

  const leftPane =
    isViewMode ? (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] gap-3 p-8">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm text-center">
          PDF not stored. Re-upload the file to see the split-pane view.
        </p>
        <UploadZone onFileSelect={handleReUploadPdf} currentFile={null} onError={setError} />
      </div>
    ) : file ? (
      <PdfViewer
        file={file}
        highlightTarget={highlightTarget}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    ) : (
      <UploadZone onFileSelect={handleFileSelect} currentFile={null} onError={setError} />
    );

  const rightPane = (
    <ResultsPanel
      file={file}
      extraction={extraction}
      meta={meta}
      isExtracting={isExtracting}
      noApiKey={!apiKey}
      selectedBiomarker={selectedBiomarker}
      onExtract={onExtract}
      onSelectBiomarker={handleSelectBiomarker}
      onUpdateBiomarker={handleUpdateBiomarker}
      onUpdateReportInfo={handleUpdateReportInfo}
      onDeleteBiomarker={handleDeleteBiomarker}
      onAddBiomarker={handleAddBiomarker}
    />
  );

  return (
    <>
      {rangeConflicts && rangeConflicts.length > 0 && (
        <RangeConflictModal
          conflicts={rangeConflicts}
          onClose={() => setRangeConflicts(null)}
        />
      )}

      {/* Header — frosted glass */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border-light)] backdrop-blur-lg flex-shrink-0" style={{ background: 'var(--color-header-bg)', boxShadow: 'var(--color-header-shadow)' }}>
        <button
          onClick={async () => { await flushPendingDelete(); onBack(); }}
          className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="w-px h-5 bg-[var(--color-border)]" />
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
          {mode.type === "view"
            ? mode.file.collectionDate
              ? formatDate(mode.file.collectionDate)
              : mode.file.filename
            : "New Extraction"}
        </h1>
        {mode.type === "view" && mode.file.collectionDate && (mode.file.labName || mode.file.source) && (
          <span className="text-sm text-[var(--color-text-tertiary)]">
            {[mode.file.labName, mode.file.source].filter(Boolean).join(" · ")}
          </span>
        )}
        {file && mode.type === "new" && (
          <UploadZone onFileSelect={handleFileSelect} currentFile={file} onError={setError} />
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2.5 flex items-center gap-3 text-sm border-b border-[var(--color-error-bg)] flex-shrink-0" style={{ background: 'var(--color-error-bg)' }}>
          <svg className="w-4 h-4 text-[var(--color-error)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[var(--color-error-text)]">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs text-[var(--color-error-text)] hover:text-[var(--color-error-hover)] font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {mode.type === "new" && !file ? (
          <div className="flex flex-col items-center justify-center h-full px-4 bg-[var(--color-surface-secondary)]">
            <div className="w-full max-w-lg">
              <UploadZone onFileSelect={handleFileSelect} currentFile={null} onError={setError} />
              {!apiKey && (
                <div className="mt-4 card px-4 py-3 text-sm text-center" style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}>
                  <span className="text-[var(--color-warning-text)]">No API key set. Add one in Settings before extracting.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SplitPane left={leftPane} right={rightPane} />
        )}
      </main>

      {toastItem && <UndoToast name={toastItem.name} onUndo={handleUndo} />}
    </>
  );
}

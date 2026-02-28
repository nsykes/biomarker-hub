"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { SplitPane } from "@/components/SplitPane";
import { ResultsPanel } from "@/components/ResultsPanel";
import { UploadZone } from "@/components/UploadZone";
import {
  Biomarker,
  ExtractionResult,
  ExtractionMeta,
  ExtractionResponse,
  HighlightTarget,
  StoredFile,
  ReferenceRangeConflict,
} from "@/lib/types";
import { buildHighlightTarget } from "@/lib/highlight";
import { formatDate } from "@/lib/utils";
import { saveFile, reextractReport, getSettingsSafe, updateFileBiomarkers, updateReportInfo, reconcileReferenceRanges } from "@/lib/db/actions";
import { RangeConflictModal } from "@/components/RangeConflictModal";
import { UndoToast } from "@/components/UndoToast";
import { DEFAULT_MODEL, UNDO_TOAST_DURATION_MS } from "@/lib/constants";
import { validatePdfFile } from "@/lib/pdf-validation";

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

  const initialExtraction = mode.type === "view"
    ? {
        reportInfo: {
          source: mode.file.source ?? "",
          labName: mode.file.labName ?? null,
          collectionDate: mode.file.collectionDate ?? "",
          reportType: (mode.file.reportType as "blood_panel" | "dexa_scan" | "other") ?? "other",
        },
        biomarkers: mode.file.biomarkers,
      }
    : null;
  const [extraction, setExtraction] = useState<ExtractionResult | null>(initialExtraction);
  const extractionRef = useRef(initialExtraction);
  useEffect(() => { extractionRef.current = extraction; }, [extraction]);
  const [meta, setMeta] = useState<ExtractionMeta | null>(
    mode.type === "view" ? mode.file.meta : null
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFileId, setSavedFileId] = useState<string | null>(
    mode.type === "view" ? mode.file.id : null
  );

  const [selectedBiomarker, setSelectedBiomarker] = useState<Biomarker | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget | null>(null);
  const [rangeConflicts, setRangeConflicts] = useState<ReferenceRangeConflict[] | null>(null);

  const [toastItem, setToastItem] = useState<{ id: string; name: string } | null>(null);
  const pendingDeleteRef = useRef<{
    biomarker: Biomarker;
    index: number;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  const [defaultModel, setDefaultModel] = useState<string>(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    getSettingsSafe().then((result) => {
      if (result.data) {
        setDefaultModel(result.data.defaultModel);
        setApiKey(result.data.openRouterApiKey);
      }
    });
  }, []);

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
  }, []);

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

  const handleExtract = useCallback(
    async () => {
      if (!file) return;
      setIsExtracting(true);
      setError(null);
      setExtraction(null);
      setMeta(null);
      setSelectedBiomarker(null);
      setHighlightTarget(null);

      try {
        const formData = new FormData();
        formData.append("pdf", file);
        formData.append("model", defaultModel);
        if (apiKey) {
          formData.append("apiKey", apiKey);
        }

        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Extraction failed: ${response.status}`
          );
        }

        // Response is streamed with keep-alive spaces; read full body and parse
        const text = await response.text();
        const parsed = JSON.parse(text.trim());
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        const data: ExtractionResponse = parsed;
        setExtraction(data.extraction);
        setMeta(data.meta);

        // Auto-save to database
        try {
          const extractionData = {
            source: data.extraction.reportInfo.source || null,
            labName: data.extraction.reportInfo.labName || null,
            collectionDate: data.extraction.reportInfo.collectionDate || null,
            reportType: data.extraction.reportInfo.reportType || null,
            biomarkers: data.extraction.biomarkers,
            meta: data.meta,
          };

          let id: string;
          if (savedFileId) {
            // Re-extraction: update existing report in-place
            await reextractReport(savedFileId, extractionData);
            id = savedFileId;
          } else {
            // New extraction: create a new report
            id = await saveFile({ filename: file.name, ...extractionData });
            setSavedFileId(id);
          }

          // Upload PDF to database
          const uploadRes = await fetch(`/api/reports/${id}/pdf`, { method: "PUT", body: file });
          if (!uploadRes.ok) {
            const retry = await fetch(`/api/reports/${id}/pdf`, { method: "PUT", body: file });
            if (!retry.ok) {
              console.error("PDF upload failed after retry:", retry.status);
            }
          }
        } catch (saveErr) {
          console.error("Failed to auto-save:", saveErr);
        }

        // Reconcile reference ranges from PDF
        try {
          const reconcileInput = data.extraction.biomarkers
            .filter((b) => b.canonicalSlug && (b.referenceRangeLow !== null || b.referenceRangeHigh !== null))
            .map((b) => ({
              canonicalSlug: b.canonicalSlug!,
              referenceRangeLow: b.referenceRangeLow,
              referenceRangeHigh: b.referenceRangeHigh,
              unit: b.unit,
              metricName: b.metricName,
            }));
          if (reconcileInput.length > 0) {
            const conflicts = await reconcileReferenceRanges(reconcileInput);
            if (conflicts.length > 0) {
              setRangeConflicts(conflicts);
            }
          }
        } catch (reconcileErr) {
          console.error("Failed to reconcile reference ranges:", reconcileErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Extraction failed");
      } finally {
        setIsExtracting(false);
      }
    },
    [file, apiKey, defaultModel, savedFileId]
  );

  const handleUpdateReportInfo = useCallback(
    (field: string, value: string) => {
      setExtraction((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          reportInfo: { ...prev.reportInfo, [field]: value },
        };
        if (savedFileId) {
          updateReportInfo(savedFileId, { [field]: value }).catch(console.error);
        }
        return updated;
      });
    },
    [savedFileId]
  );

  const flushPendingDelete = useCallback(async () => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setToastItem(null);
    if (savedFileId && extractionRef.current) {
      await updateFileBiomarkers(savedFileId, extractionRef.current.biomarkers);
    }
  }, [savedFileId]);

  const handleDeleteBiomarker = useCallback(
    (id: string) => {
      // Finalize any existing pending deletion first
      flushPendingDelete();

      setExtraction((prev) => {
        if (!prev) return prev;
        const index = prev.biomarkers.findIndex((b) => b.id === id);
        if (index === -1) return prev;
        const deleted = prev.biomarkers[index];

        const timeoutId = setTimeout(() => {
          pendingDeleteRef.current = null;
          setToastItem(null);
          if (savedFileId && extractionRef.current) {
            updateFileBiomarkers(savedFileId, extractionRef.current.biomarkers).catch(console.error);
          }
        }, UNDO_TOAST_DURATION_MS);

        pendingDeleteRef.current = { biomarker: deleted, index, timeoutId };
        setToastItem({ id: deleted.id, name: deleted.metricName || deleted.rawName });

        return {
          ...prev,
          biomarkers: prev.biomarkers.filter((b) => b.id !== id),
        };
      });
    },
    [savedFileId, flushPendingDelete]
  );

  const handleUndo = useCallback(() => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setToastItem(null);
    setExtraction((prev) => {
      if (!prev) return prev;
      const restored = [...prev.biomarkers];
      restored.splice(Math.min(pending.index, restored.length), 0, pending.biomarker);
      return { ...prev, biomarkers: restored };
    });
  }, []);

  const handleAddBiomarker = useCallback(
    (biomarker: Biomarker) => {
      setExtraction((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          biomarkers: [...prev.biomarkers, biomarker],
        };
        if (savedFileId) {
          updateFileBiomarkers(savedFileId, updated.biomarkers).catch(console.error);
        }
        return updated;
      });
    },
    [savedFileId]
  );

  const handleSelectBiomarker = useCallback((biomarker: Biomarker) => {
    setSelectedBiomarker(biomarker);
    setHighlightTarget(buildHighlightTarget(biomarker));
  }, []);

  const handleUpdateBiomarker = useCallback(
    (id: string, field: keyof Biomarker, value: unknown) => {
      setExtraction((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          biomarkers: prev.biomarkers.map((b) =>
            b.id === id ? { ...b, [field]: value } : b
          ),
        };
        // Auto-save edits if we have a saved file
        if (savedFileId) {
          updateFileBiomarkers(savedFileId, updated.biomarkers).catch(
            console.error
          );
        }
        return updated;
      });
    },
    [savedFileId]
  );

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
      onExtract={handleExtract}
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
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border-light)] bg-white/80 backdrop-blur-lg flex-shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
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
        <div className="px-4 py-2.5 flex items-center gap-3 text-sm border-b border-[#FDE8E8] flex-shrink-0" style={{ background: '#FDE8E8' }}>
          <svg className="w-4 h-4 text-[#FF3B30] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[#CC2D24]">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs text-[#CC2D24] hover:text-[#991b1b] font-medium">
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
                <div className="mt-4 card px-4 py-3 text-sm text-center" style={{ background: '#FFF3E0', borderColor: '#FFE0B2' }}>
                  <span className="text-[#B36B00]">No API key set. Add one in Settings before extracting.</span>
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

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
} from "@/lib/types";
import { buildHighlightTarget } from "@/lib/highlight";
import { saveFile, getSettings, updateFileBiomarkers } from "@/lib/db/actions";

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

  const [extraction, setExtraction] = useState<ExtractionResult | null>(
    mode.type === "view"
      ? {
          reportInfo: {
            source: mode.file.source ?? "",
            labName: mode.file.labName ?? null,
            collectionDate: mode.file.collectionDate ?? "",
            reportType: (mode.file.reportType as "blood_panel" | "dexa_scan" | "other") ?? "other",
          },
          biomarkers: mode.file.biomarkers,
        }
      : null
  );
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

  const [defaultModel, setDefaultModel] = useState<string>("google/gemini-2.5-pro");
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setDefaultModel(s.defaultModel);
      setApiKey(s.openRouterApiKey);
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
    setFile(f);
    setExtraction(null);
    setMeta(null);
    setSelectedBiomarker(null);
    setHighlightTarget(null);
    setCurrentPage(1);
    setError(null);
    setSavedFileId(null);
  }, []);

  const handleExtract = useCallback(
    async (model: string) => {
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
        formData.append("model", model);
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

        const data: ExtractionResponse = await response.json();
        setExtraction(data.extraction);
        setMeta(data.meta);

        // Auto-save to database
        try {
          const id = await saveFile({
            filename: file.name,
            source: data.extraction.reportInfo.source || null,
            labName: data.extraction.reportInfo.labName || null,
            collectionDate: data.extraction.reportInfo.collectionDate || null,
            reportType: data.extraction.reportInfo.reportType || null,
            biomarkers: data.extraction.biomarkers,
            meta: data.meta,
          });
          setSavedFileId(id);
          // Upload PDF to database
          fetch(`/api/reports/${id}/pdf`, { method: "PUT", body: file }).catch(console.error);
        } catch (saveErr) {
          console.error("Failed to auto-save:", saveErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Extraction failed");
      } finally {
        setIsExtracting(false);
      }
    },
    [file, apiKey]
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

  const handlePageClick = useCallback((page: number) => {
    setCurrentPage(page);
    setHighlightTarget(null);
  }, []);

  const isViewMode = mode.type === "view" && !file;

  const leftPane =
    isViewMode ? (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 p-8">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm text-center">
          PDF not stored. Re-upload the file to see the split-pane view.
        </p>
        <UploadZone onFileSelect={handleFileSelect} currentFile={null} />
      </div>
    ) : file ? (
      <PdfViewer
        file={file}
        highlightTarget={highlightTarget}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    ) : (
      <UploadZone onFileSelect={handleFileSelect} currentFile={null} />
    );

  const rightPane = (
    <ResultsPanel
      file={file}
      extraction={extraction}
      meta={meta}
      isExtracting={isExtracting}
      selectedBiomarker={selectedBiomarker}
      onExtract={handleExtract}
      onSelectBiomarker={handleSelectBiomarker}
      onUpdateBiomarker={handleUpdateBiomarker}
      onPageClick={handlePageClick}
      defaultModel={defaultModel}
    />
  );

  return (
    <>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 border-b bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <h1 className="text-lg font-bold">
          {mode.type === "view" ? mode.file.filename : "New Extraction"}
        </h1>
        {file && mode.type === "new" && (
          <UploadZone onFileSelect={handleFileSelect} currentFile={file} />
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-200 flex-shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <SplitPane left={leftPane} right={rightPane} />
      </main>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { PdfViewer } from "./PdfViewer";
import { Spinner } from "./Spinner";

interface PdfPreviewModalProps {
  reportId: string;
  page: number | null;
  onClose: () => void;
}

export function PdfPreviewModal({ reportId, page, onClose }: PdfPreviewModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page ?? 1);

  useEffect(() => {
    let cancelled = false;
    async function fetchPdf() {
      try {
        const res = await fetch(`/api/reports/${reportId}/pdf`);
        if (!res.ok) {
          setError(res.status === 404 ? "PDF not found" : "Failed to load PDF");
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        setFile(new File([blob], "report.pdf", { type: "application/pdf" }));
      } catch {
        if (!cancelled) setError("Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPdf();
    return () => { cancelled = true; };
  }, [reportId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-4xl w-full mx-4 h-[85vh] flex flex-col"
        style={{ boxShadow: "var(--color-modal-shadow)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-light)] flex-shrink-0">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
            PDF Preview
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-tertiary)]">
              {error}
            </div>
          )}
          {!loading && !error && file && (
            <PdfViewer
              file={file}
              highlightTarget={null}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

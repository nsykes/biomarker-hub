"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "./Spinner";
import { MobileSheet } from "./MobileSheet";

const PdfViewer = dynamic(
  () => import("./PdfViewer").then((m) => m.PdfViewer),
  { ssr: false }
);

interface SharedPdfPreviewModalProps {
  token: string;
  password: string;
  reportId: string;
  page: number | null;
  onClose: () => void;
}

export function SharedPdfPreviewModal({
  token,
  password,
  reportId,
  page,
  onClose,
}: SharedPdfPreviewModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page ?? 1);

  useEffect(() => {
    let cancelled = false;
    async function fetchPdf() {
      try {
        const res = await fetch(
          `/api/share/${token}/pdf/${reportId}?p=${encodeURIComponent(password)}`
        );
        if (!res.ok) {
          setError(
            res.status === 404 ? "PDF not found" : "Failed to load PDF"
          );
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        setFile(
          new File([blob], "report.pdf", { type: "application/pdf" })
        );
      } catch {
        if (!cancelled) setError("Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPdf();
    return () => {
      cancelled = true;
    };
  }, [token, password, reportId]);

  return (
    <MobileSheet
      onClose={onClose}
      desktopMaxWidth="max-w-4xl"
      className="h-[95dvh] md:h-[85vh]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-light)] flex-shrink-0">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
          PDF Preview
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)]"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

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
    </MobileSheet>
  );
}

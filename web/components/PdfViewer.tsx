"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { HighlightTarget } from "@/lib/types";
import { applyHighlights } from "@/lib/highlight";

// Serve worker from public/ to avoid CDN and bundler resolution issues
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  file: File | null;
  highlightTarget: HighlightTarget | null;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PdfViewer({
  file,
  highlightTarget,
  currentPage,
  onPageChange,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const cleanupHighlightRef = useRef<(() => void) | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync so the stable callback can access current values
  const highlightTargetRef = useRef(highlightTarget);
  highlightTargetRef.current = highlightTarget;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  // Convert File to object URL for react-pdf
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFileUrl(null);
  }, [file]);

  // Navigate to highlighted page when target changes
  useEffect(() => {
    if (highlightTarget && highlightTarget.page !== currentPage) {
      onPageChange(highlightTarget.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightTarget]);

  // Debounced highlight scheduler — when called multiple times (StrictMode,
  // useEffect, onRenderTextLayerSuccess), only the LAST call's timeout
  // survives. 100ms after the last call the text layer is fully settled.
  const scheduleHighlight = useCallback(() => {
    if (pendingTimeoutRef.current !== null) {
      clearTimeout(pendingTimeoutRef.current);
    }

    const target = highlightTargetRef.current;
    if (target && target.page === currentPageRef.current && pageRef.current) {
      pendingTimeoutRef.current = setTimeout(() => {
        pendingTimeoutRef.current = null;
        requestAnimationFrame(() => {
          // Cleanup old highlight right before applying new one (no flash)
          if (cleanupHighlightRef.current) {
            cleanupHighlightRef.current();
            cleanupHighlightRef.current = null;
          }
          if (pageRef.current && highlightTargetRef.current) {
            cleanupHighlightRef.current = applyHighlights(
              pageRef.current,
              highlightTargetRef.current
            );
          }
        });
      }, 100);
    } else if (!target) {
      // Target cleared — cleanup immediately
      if (cleanupHighlightRef.current) {
        cleanupHighlightRef.current();
        cleanupHighlightRef.current = null;
      }
    } else {
      // Target exists but on a different page — cleanup stale highlight
      if (cleanupHighlightRef.current) {
        cleanupHighlightRef.current();
        cleanupHighlightRef.current = null;
      }
    }
  }, []);

  // Stable callback — never changes, so <Page> doesn't re-render the text layer
  const handleTextLayerSuccess = useCallback(() => {
    scheduleHighlight();
  }, [scheduleHighlight]);

  // Handle highlight changes on the current page (text layer won't re-render for same-page clicks)
  useEffect(() => {
    scheduleHighlight();
    return () => {
      if (pendingTimeoutRef.current !== null) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    };
  }, [highlightTarget, currentPage, scheduleHighlight]);

  const onDocumentLoadSuccess = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    if (currentPage > n) {
      onPageChange(1);
    }
  };

  if (!fileUrl) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-light)] bg-white text-sm flex-shrink-0" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const p = parseInt(e.target.value, 10);
                if (p >= 1 && p <= numPages) onPageChange(p);
              }}
              className="w-10 text-center border border-[var(--color-border)] rounded-lg px-1 py-0.5 text-sm"
              min={1}
              max={numPages}
            />
            <span className="text-[var(--color-text-tertiary)]">/ {numPages}</span>
          </span>
          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="w-px h-5 bg-[var(--color-border-light)] mx-1" />
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(1)))}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-secondary)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="w-12 text-center text-sm text-[var(--color-text-secondary)] tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, +(s + 0.1).toFixed(1)))}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-secondary)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto flex justify-center bg-[var(--color-surface-tertiary)] p-4">
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <div ref={pageRef}>
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onRenderTextLayerSuccess={handleTextLayerSuccess}
            />
          </div>
        </Document>
      </div>
    </div>
  );
}

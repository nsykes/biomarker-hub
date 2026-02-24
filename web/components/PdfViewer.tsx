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

  // Stable callback — never changes, so <Page> doesn't re-render the text layer
  const handleTextLayerSuccess = useCallback(() => {
    if (cleanupHighlightRef.current) {
      cleanupHighlightRef.current();
      cleanupHighlightRef.current = null;
    }

    const target = highlightTargetRef.current;
    if (target && target.page === currentPageRef.current && pageRef.current) {
      cleanupHighlightRef.current = applyHighlights(pageRef.current, target);
    }
  }, []);

  // Handle highlight changes on the current page (text layer won't re-render for same-page clicks)
  useEffect(() => {
    if (cleanupHighlightRef.current) {
      cleanupHighlightRef.current();
      cleanupHighlightRef.current = null;
    }
    if (highlightTarget && highlightTarget.page === currentPage && pageRef.current) {
      const raf = requestAnimationFrame(() => {
        if (pageRef.current && highlightTargetRef.current) {
          cleanupHighlightRef.current = applyHighlights(pageRef.current, highlightTargetRef.current);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [highlightTarget, currentPage]);

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
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 text-sm flex-shrink-0">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2 py-1 border rounded disabled:opacity-30 hover:bg-gray-200"
        >
          Prev
        </button>
        <span className="flex items-center gap-1">
          Page
          <input
            type="number"
            value={currentPage}
            onChange={(e) => {
              const p = parseInt(e.target.value, 10);
              if (p >= 1 && p <= numPages) onPageChange(p);
            }}
            className="w-12 text-center border rounded px-1"
            min={1}
            max={numPages}
          />
          of {numPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
          disabled={currentPage >= numPages}
          className="px-2 py-1 border rounded disabled:opacity-30 hover:bg-gray-200"
        >
          Next
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(1)))}
            className="px-2 py-1 border rounded hover:bg-gray-200"
          >
            -
          </button>
          <span className="w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, +(s + 0.1).toFixed(1)))}
            className="px-2 py-1 border rounded hover:bg-gray-200"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto flex justify-center bg-gray-100 p-4">
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

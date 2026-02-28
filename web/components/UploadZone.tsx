"use client";

import { useState, useCallback, useRef } from "react";
import { validatePdfFile } from "@/lib/pdf-validation";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  currentFile: File | null;
  onError?: (message: string) => void;
}

export function UploadZone({ onFileSelect, currentFile, onError }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (file.type !== "application/pdf") {
        onError?.("Please upload a PDF file.");
        return;
      }
      const err = validatePdfFile(file);
      if (err) {
        onError?.(err.message);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const err = validatePdfFile(file);
      if (err) {
        onError?.(err.message);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect, onError]
  );

  if (currentFile) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-tertiary)] rounded-xl text-sm">
        <span className="truncate max-w-[200px] text-[var(--color-text-primary)]">{currentFile.name}</span>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] text-xs font-medium"
        >
          Change
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        flex flex-col items-center justify-center
        h-full min-h-[400px] px-8 py-12 border-2 border-dashed rounded-2xl
        cursor-pointer transition-all duration-200
        ${isDragging
          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] scale-[1.01]"
          : "border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/50"
        }
      `}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary-light)]'}`}>
        <svg
          className={`w-6 h-6 transition-colors ${isDragging ? 'text-white' : 'text-[var(--color-primary)]'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>
      <p className="text-[var(--color-text-primary)] text-lg font-semibold mb-1">
        Drop a PDF here or click to upload
      </p>
      <p className="text-[var(--color-text-tertiary)] text-sm">
        Supports lab report PDFs for biomarker extraction
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}

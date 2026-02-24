"use client";

import { useState, useCallback, useRef } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  currentFile: File | null;
}

export function UploadZone({ onFileSelect, currentFile }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect]
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
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  if (currentFile) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded text-sm">
        <span className="truncate max-w-[200px]">{currentFile.name}</span>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-blue-600 hover:underline text-xs"
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
        h-full min-h-[400px] px-8 py-12 border-2 border-dashed rounded-lg
        cursor-pointer transition-colors
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
      `}
    >
      <svg
        className="w-10 h-10 text-gray-300 mb-4"
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
      <p className="text-gray-500 text-lg font-medium mb-1">
        Drop a PDF here or click to upload
      </p>
      <p className="text-gray-400 text-sm">
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

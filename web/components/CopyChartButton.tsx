"use client";

import { useRef, useState } from "react";
import { copyElementAsPng } from "@/lib/copy-chart-image";

interface CopyChartButtonProps {
  targetRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

export function CopyChartButton({ targetRef, className }: CopyChartButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = targetRef.current;
    if (!el) return;
    try {
      await copyElementAsPng(el);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("copy chart as image failed", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-export-hide="true"
      title={copied ? "Copied!" : "Copy chart as image"}
      aria-label={copied ? "Chart copied to clipboard" : "Copy chart as image"}
      className={`p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0 ${className ?? ""}`}
    >
      {copied ? (
        <svg
          className="w-4 h-4 text-[var(--color-success,#34C759)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

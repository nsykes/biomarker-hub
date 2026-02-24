"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number;
  minPaneWidth?: number;
}

export function SplitPane({
  left,
  right,
  defaultSplit = 0.5,
  minPaneWidth = 300,
}: SplitPaneProps) {
  const [split, setSplit] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const totalWidth = rect.width;
      let newSplit = x / totalWidth;

      const minRatio = minPaneWidth / totalWidth;
      newSplit = Math.max(minRatio, Math.min(1 - minRatio, newSplit));

      setSplit(newSplit);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minPaneWidth]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full overflow-hidden ${isDragging ? "select-none" : ""}`}
      style={{ cursor: isDragging ? "col-resize" : undefined }}
    >
      <div
        className="overflow-auto h-full"
        style={{
          flexBasis: `${split * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
        }}
      >
        {left}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className={`
          w-1.5 flex-shrink-0 cursor-col-resize relative
          bg-[var(--color-border-light)] transition-colors duration-150
          hover:bg-[var(--color-primary)] active:bg-[var(--color-primary)]
          ${isDragging ? "bg-[var(--color-primary)]" : ""}
        `}
      >
        {/* Grip indicator dots */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
          <div className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-[var(--color-text-tertiary)]'}`} />
          <div className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-[var(--color-text-tertiary)]'}`} />
          <div className={`w-1 h-1 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-[var(--color-text-tertiary)]'}`} />
        </div>
      </div>
      <div
        className="overflow-auto h-full"
        style={{
          flexBasis: `${(1 - split) * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
        }}
      >
        {right}
      </div>
    </div>
  );
}

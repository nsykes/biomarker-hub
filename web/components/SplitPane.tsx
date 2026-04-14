"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number;
  minPaneWidth?: number;
  leftLabel?: string;
  rightLabel?: string;
}

export function SplitPane({
  left,
  right,
  defaultSplit = 0.5,
  minPaneWidth = 300,
  leftLabel = "Left",
  rightLabel = "Right",
}: SplitPaneProps) {
  const [split, setSplit] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const [mobilePane, setMobilePane] = useState<"left" | "right">("left");
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

  if (!isDesktop) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]">
          <div className="flex gap-1 bg-[var(--color-surface-tertiary)] rounded-full p-0.5 w-full max-w-sm mx-auto">
            {(["left", "right"] as const).map((side) => {
              const active = mobilePane === side;
              const label = side === "left" ? leftLabel : rightLabel;
              return (
                <button
                  key={side}
                  onClick={() => setMobilePane(side)}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                    active
                      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-sm"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className={`flex-1 overflow-auto ${mobilePane === "left" ? "block" : "hidden"}`}>
          {left}
        </div>
        <div className={`flex-1 overflow-auto ${mobilePane === "right" ? "block" : "hidden"}`}>
          {right}
        </div>
      </div>
    );
  }

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

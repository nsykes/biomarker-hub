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
          w-1 flex-shrink-0 cursor-col-resize
          bg-gray-200 hover:bg-blue-400 transition-colors
          ${isDragging ? "bg-blue-500" : ""}
        `}
      />
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

"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  children: ReactNode;
  width?: string;
}

export function InfoTooltip({ children, width = "w-72" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, flipUp: false });
  const iconRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < 220;

    setPos({
      top: flipUp ? rect.top : rect.bottom + 6,
      left: Math.min(rect.left + rect.width / 2, window.innerWidth - 160),
      flipUp,
    });
    setOpen(true);
  }, []);

  return (
    <div
      ref={iconRef}
      className="relative flex-shrink-0"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      <svg
        className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] cursor-help"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>

      {open &&
        createPortal(
          <div
            className={`fixed ${width} max-h-48 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl shadow-lg px-3 py-2.5 z-[9999]`}
            style={{
              top: pos.flipUp ? undefined : pos.top,
              bottom: pos.flipUp
                ? window.innerHeight - pos.top + 6
                : undefined,
              left: pos.left,
              transform: "translateX(-50%)",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}

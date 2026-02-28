"use client";

import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  children: ReactNode;
  width?: string;
}

interface Layout {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
  needsScroll: boolean;
}

const GAP = 6; // px between icon and tooltip
const MARGIN = 12; // px from viewport edges
const MIN_HEIGHT = 80;

export function InfoTooltip({ children, width = "w-72" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Measure content and compute position after portal renders
  useLayoutEffect(() => {
    if (!open || !iconRef.current || !tooltipRef.current) return;

    const iconRect = iconRef.current.getBoundingClientRect();
    const el = tooltipRef.current;
    const naturalHeight = el.scrollHeight;
    const tooltipWidth = el.offsetWidth;

    const spaceBelow = window.innerHeight - iconRect.bottom - GAP - MARGIN;
    const spaceAbove = iconRect.top - GAP - MARGIN;

    let flipUp = false;
    let available: number;

    if (naturalHeight <= spaceBelow) {
      flipUp = false;
      available = naturalHeight;
    } else if (naturalHeight <= spaceAbove) {
      flipUp = true;
      available = naturalHeight;
    } else {
      flipUp = spaceAbove > spaceBelow;
      available = Math.max(flipUp ? spaceAbove : spaceBelow, MIN_HEIGHT);
    }

    // Horizontal: center on icon, clamp within viewport
    const idealLeft = iconRect.left + iconRect.width / 2;
    const minLeft = MARGIN + tooltipWidth / 2;
    const maxLeft = window.innerWidth - MARGIN - tooltipWidth / 2;
    const clampedLeft = Math.min(Math.max(idealLeft, minLeft), maxLeft);

    setLayout({
      top: flipUp ? undefined : iconRect.bottom + GAP,
      bottom: flipUp ? window.innerHeight - iconRect.top + GAP : undefined,
      left: clampedLeft,
      maxHeight: available,
      needsScroll: naturalHeight > available,
    });
  }, [open]);

  const show = useCallback(() => {
    setLayout(null);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setLayout(null);
  }, []);

  return (
    <div
      ref={iconRef}
      className="relative flex-shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
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
            ref={tooltipRef}
            data-tooltip-scroll={layout?.needsScroll ? "" : undefined}
            className={`fixed ${width} bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl shadow-lg px-3 py-2.5 z-[9999]`}
            style={
              layout === null
                ? // Phase 1: invisible, unconstrained — for measurement
                  { visibility: "hidden" as const, top: 0, left: 0 }
                : // Phase 2: positioned and constrained
                  {
                    top: layout.top,
                    bottom: layout.bottom,
                    left: layout.left,
                    transform: "translateX(-50%)",
                    maxHeight: layout.maxHeight,
                    overflowY: layout.needsScroll ? ("auto" as const) : undefined,
                  }
            }
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={hide}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}

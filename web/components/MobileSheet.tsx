"use client";

import { useEffect } from "react";

interface MobileSheetProps {
  onClose: () => void;
  /** Desktop dialog sizing — e.g. "max-w-md", "max-w-lg", "max-w-4xl" */
  desktopMaxWidth?: string;
  /** Set false to disable the backdrop-click / Escape close behavior */
  closeOnOverlayClick?: boolean;
  children: React.ReactNode;
  /**
   * Extra class merged onto the mobile sheet shell. Use responsive prefixes
   * (`h-[95dvh] md:h-[85vh]`) when you need different heights per breakpoint.
   */
  className?: string;
}

/**
 * Shared modal shell.
 * - <md: renders as a bottom sheet filling the viewport width with a drag handle.
 * - >=md: renders as a centered dialog using `desktopMaxWidth`.
 *
 * Child components provide their own internal padding/headers/footers.
 */
export function MobileSheet({
  onClose,
  desktopMaxWidth = "max-w-md",
  closeOnOverlayClick = true,
  children,
  className = "",
}: MobileSheetProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnOverlayClick) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, closeOnOverlayClick]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-[var(--color-surface)]
          w-full md:mx-4
          rounded-t-2xl md:rounded-2xl
          shadow-2xl
          max-h-[95dvh] md:max-h-[90vh]
          flex flex-col
          safe-pb md:pb-0
          ${desktopMaxWidth}
          ${className}
        `}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
        </div>
        {children}
      </div>
    </div>
  );
}

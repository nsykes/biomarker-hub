"use client";

import { BiomarkerFlag } from "@/lib/types";

const FLAG_STYLES: Record<BiomarkerFlag, string> = {
  NORMAL: "bg-[var(--color-flag-normal-bg)] text-[var(--color-flag-normal-text)]",
  LOW: "bg-[var(--color-flag-low-bg)] text-[var(--color-flag-low-text)]",
  HIGH: "bg-[var(--color-flag-high-bg)] text-[var(--color-flag-high-text)]",
  ABNORMAL: "bg-[var(--color-flag-abnormal-bg)] text-[var(--color-flag-abnormal-text)]",
  CRITICAL_LOW: "bg-[var(--color-flag-critical-low-bg)] text-[var(--color-flag-critical-low-text)] font-bold",
  CRITICAL_HIGH: "bg-[var(--color-flag-critical-high-bg)] text-[var(--color-flag-critical-high-text)] font-bold",
};

export function FlagBadge({ flag }: { flag: BiomarkerFlag }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${FLAG_STYLES[flag]}`}
    >
      {flag.replace("_", " ")}
    </span>
  );
}

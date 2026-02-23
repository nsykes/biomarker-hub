"use client";

import { BiomarkerFlag } from "@/lib/types";

const FLAG_STYLES: Record<BiomarkerFlag, string> = {
  NORMAL: "bg-green-100 text-green-800",
  LOW: "bg-blue-100 text-blue-800",
  HIGH: "bg-red-100 text-red-800",
  ABNORMAL: "bg-yellow-100 text-yellow-800",
  CRITICAL_LOW: "bg-blue-200 text-blue-900 font-bold",
  CRITICAL_HIGH: "bg-red-200 text-red-900 font-bold",
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

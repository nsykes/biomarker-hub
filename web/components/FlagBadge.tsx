"use client";

import { BiomarkerFlag } from "@/lib/types";

const FLAG_STYLES: Record<BiomarkerFlag, string> = {
  NORMAL: "bg-[#E8FAF0] text-[#1B7F37]",
  LOW: "bg-[#EDEDFB] text-[#4240B0]",
  HIGH: "bg-[#FDE8E8] text-[#CC2D24]",
  ABNORMAL: "bg-[#FFF3E0] text-[#B36B00]",
  CRITICAL_LOW: "bg-[#E0E0F5] text-[#2A288A] font-bold",
  CRITICAL_HIGH: "bg-[#FBD5D5] text-[#9E1A17] font-bold",
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

"use client";

import { REPORT_TYPES, REPORT_TYPE_META, type ReportType } from "@/lib/report-types";

interface ReportTypeFieldProps {
  value: ReportType;
  onSave: (value: ReportType) => void;
}

export function ReportTypeField({ value, onSave }: ReportTypeFieldProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--color-text-secondary)] text-xs font-medium">Type:</span>
      <span
        className={`relative inline-flex items-center rounded-full ${REPORT_TYPE_META[value].badgeClass}`}
      >
        <select
          value={value}
          onChange={(e) => onSave(e.target.value as ReportType)}
          className="appearance-none cursor-pointer bg-transparent border-0 pl-2 pr-5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0"
          title="Click to change report type"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {REPORT_TYPE_META[t].label}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </span>
  );
}

export const REPORT_TYPES = ["blood_panel", "dexa_scan", "other"] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_META: Record<ReportType, { label: string; badgeClass: string }> = {
  blood_panel: {
    label: "Blood",
    badgeClass: "bg-[var(--color-badge-blood-bg)] text-[var(--color-badge-blood-text)]",
  },
  dexa_scan: {
    label: "DEXA",
    badgeClass: "bg-[var(--color-badge-dexa-bg)] text-[var(--color-badge-dexa-text)]",
  },
  other: {
    label: "Other",
    badgeClass: "bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]",
  },
};

export function isReportType(v: unknown): v is ReportType {
  return typeof v === "string" && (REPORT_TYPES as readonly string[]).includes(v);
}

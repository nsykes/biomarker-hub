"use client";

import type { BiomarkerTabId } from "./types";

interface BiomarkerTabIconProps {
  id: BiomarkerTabId;
  active: boolean;
}

function BiomarkerTabIcon({ id, active }: BiomarkerTabIconProps) {
  const stroke = active ? "var(--color-primary)" : "currentColor";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "files":
      return (
        <svg {...common}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
      );
    case "biomarkers":
      return (
        <svg {...common}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );
    case "dashboards":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "goals":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill={stroke} />
        </svg>
      );
  }
}

export interface BiomarkerTabDef {
  id: BiomarkerTabId;
  label: string;
  renderIcon: (props: { active: boolean }) => React.ReactNode;
}

export const BIOMARKER_TABS: readonly BiomarkerTabDef[] = [
  { id: "files", label: "Files", renderIcon: ({ active }) => <BiomarkerTabIcon id="files" active={active} /> },
  { id: "biomarkers", label: "Biomarkers", renderIcon: ({ active }) => <BiomarkerTabIcon id="biomarkers" active={active} /> },
  { id: "dashboards", label: "Dashboards", renderIcon: ({ active }) => <BiomarkerTabIcon id="dashboards" active={active} /> },
  { id: "goals", label: "Goals", renderIcon: ({ active }) => <BiomarkerTabIcon id="goals" active={active} /> },
];

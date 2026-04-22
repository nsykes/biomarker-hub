import type { StoredFile } from "@/lib/types";

export type BiomarkerTabId = "files" | "biomarkers" | "dashboards" | "goals";

export const BIOMARKER_TAB_IDS: readonly BiomarkerTabId[] = [
  "files",
  "biomarkers",
  "dashboards",
  "goals",
] as const;

export type ExtractionMode =
  | { type: "new" }
  | { type: "view"; file: StoredFile };

export type ExtractionMarker = { type: "new" } | { type: "view" };

export interface BiomarkerModuleState {
  activeTab: BiomarkerTabId;
  biomarkerSlug: string | null;
  dashboardId: string | null;
  extraction: ExtractionMarker | null;
}

export const BIOMARKER_INITIAL_STATE: BiomarkerModuleState = {
  activeTab: "files",
  biomarkerSlug: null,
  dashboardId: null,
  extraction: null,
};

import type { ModuleDef } from "@/modules/types";
import { BiomarkerModule } from "./BiomarkerModule";
import {
  BIOMARKER_INITIAL_STATE,
  BIOMARKER_TAB_IDS,
  type BiomarkerModuleState,
  type BiomarkerTabId,
} from "./types";

function parseBiomarkerUrlState(params: URLSearchParams): BiomarkerModuleState {
  const rawTab = params.get("tab");
  const activeTab: BiomarkerTabId = BIOMARKER_TAB_IDS.includes(rawTab as BiomarkerTabId)
    ? (rawTab as BiomarkerTabId)
    : "files";
  const biomarkerSlug = params.get("biomarker");
  const dashboardId = params.get("dashboard");
  const rawExtraction = params.get("extraction");
  const extraction: BiomarkerModuleState["extraction"] =
    rawExtraction === "new"
      ? { type: "new" }
      : rawExtraction === "view"
        ? { type: "view" }
        : null;

  return {
    activeTab,
    biomarkerSlug: biomarkerSlug || null,
    dashboardId: dashboardId || null,
    extraction,
  };
}

function stringifyBiomarkerUrlState(
  state: BiomarkerModuleState
): Record<string, string> {
  const out: Record<string, string> = {};
  if (state.activeTab !== "files") out.tab = state.activeTab;
  if (state.biomarkerSlug) out.biomarker = state.biomarkerSlug;
  if (state.dashboardId) out.dashboard = state.dashboardId;
  if (state.extraction) out.extraction = state.extraction.type;
  return out;
}

function BiomarkerIcon({ active }: { active: boolean }) {
  const stroke = active ? "var(--color-primary)" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  );
}

export const biomarkerModule: ModuleDef<BiomarkerModuleState> = {
  id: "biomarker",
  name: "Biomarkers",
  renderIcon: ({ active }) => <BiomarkerIcon active={active} />,
  initialState: BIOMARKER_INITIAL_STATE,
  fullBleed: (state) => state.extraction !== null,
  parseUrlState: parseBiomarkerUrlState,
  stringifyUrlState: stringifyBiomarkerUrlState,
  render: (ctx) => <BiomarkerModule state={ctx.state} setState={ctx.setState} />,
};

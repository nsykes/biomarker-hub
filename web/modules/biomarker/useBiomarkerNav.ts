"use client";

import { useCallback, useState } from "react";
import type { StoredFile } from "@/lib/types";
import {
  BIOMARKER_INITIAL_STATE,
  type BiomarkerModuleState,
  type BiomarkerTabId,
  type ExtractionMode,
} from "./types";

interface BiomarkerNavActions {
  switchTab: (tab: BiomarkerTabId) => void;
  openBiomarker: (slug: string) => void;
  openDashboard: (id: string) => void;
  openExtraction: (mode: ExtractionMode) => void;
  closeExtraction: () => void;
  ensureMounted: (tab: BiomarkerTabId) => void;
}

interface BiomarkerNav {
  state: BiomarkerModuleState;
  mountedTabs: Set<BiomarkerTabId>;
  extractionFile: StoredFile | null;
  actions: BiomarkerNavActions;
}

export function useBiomarkerNav(
  state: BiomarkerModuleState,
  setState: (next: BiomarkerModuleState) => void
): BiomarkerNav {
  const [mountedTabs, setMountedTabs] = useState<Set<BiomarkerTabId>>(
    () => new Set<BiomarkerTabId>([state.activeTab])
  );
  const [extractionFile, setExtractionFile] = useState<StoredFile | null>(null);

  const ensureMounted = useCallback((tab: BiomarkerTabId) => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      return new Set(prev).add(tab);
    });
  }, []);

  const switchTab = useCallback(
    (tab: BiomarkerTabId) => {
      ensureMounted(tab);
      setExtractionFile(null);
      setState({
        ...BIOMARKER_INITIAL_STATE,
        activeTab: tab,
      });
    },
    [setState, ensureMounted]
  );

  const openBiomarker = useCallback(
    (slug: string) => {
      ensureMounted("biomarkers");
      setExtractionFile(null);
      setState({
        activeTab: "biomarkers",
        biomarkerSlug: slug,
        dashboardId: null,
        extraction: null,
      });
    },
    [setState, ensureMounted]
  );

  const openDashboard = useCallback(
    (id: string) => {
      ensureMounted("dashboards");
      setExtractionFile(null);
      setState({
        activeTab: "dashboards",
        biomarkerSlug: null,
        dashboardId: id,
        extraction: null,
      });
    },
    [setState, ensureMounted]
  );

  const openExtraction = useCallback(
    (mode: ExtractionMode) => {
      setExtractionFile(mode.type === "view" ? mode.file : null);
      const extraction: BiomarkerModuleState["extraction"] =
        mode.type === "view" ? { type: "view" } : { type: "new" };
      setState({
        activeTab: "files",
        biomarkerSlug: null,
        dashboardId: null,
        extraction,
      });
    },
    [setState]
  );

  const closeExtraction = useCallback(() => {
    setExtractionFile(null);
    setState({
      ...state,
      extraction: null,
    });
  }, [state, setState]);

  // Ensure state.activeTab is mounted when it changes from outside (e.g., popstate).
  // Adjusting state during render is an approved React pattern; the guard prevents loops.
  if (!mountedTabs.has(state.activeTab)) {
    setMountedTabs((prev) =>
      prev.has(state.activeTab) ? prev : new Set(prev).add(state.activeTab)
    );
  }

  const resolvedExtractionFile =
    state.extraction && state.extraction.type === "view" ? extractionFile : null;

  return {
    state,
    mountedTabs,
    extractionFile: resolvedExtractionFile,
    actions: {
      switchTab,
      openBiomarker,
      openDashboard,
      openExtraction,
      closeExtraction,
      ensureMounted,
    },
  };
}

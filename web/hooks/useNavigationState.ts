"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TabId, StoredFile, ViewState } from "@/lib/types";

const SENTINEL = "_biomarkerNav";

interface NavigationActions {
  switchTab: (tab: TabId) => void;
  openBiomarker: (slug: string) => void;
  openDashboard: (id: string) => void;
  openExtraction: (mode: { type: "new" } | { type: "view"; file: StoredFile }) => void;
}

interface NavigationState {
  activeTab: TabId;
  biomarkerSlug: string | null;
  dashboardId: string | null;
  extractionMode: { type: "new" } | { type: "view"; file: StoredFile } | null;
  mountedTabs: Set<TabId>;
}

function toHistoryState(vs: ViewState): Record<string, unknown> {
  return {
    [SENTINEL]: true,
    tab: vs.tab,
    biomarkerSlug: vs.biomarkerSlug,
    dashboardId: vs.dashboardId,
    extraction: vs.extraction,
  };
}

function fromHistoryState(raw: unknown): ViewState | null {
  if (!raw || typeof raw !== "object" || !(SENTINEL in (raw as Record<string, unknown>)))
    return null;
  const s = raw as Record<string, unknown>;
  return {
    tab: (s.tab as TabId) ?? "files",
    biomarkerSlug: (s.biomarkerSlug as string) ?? null,
    dashboardId: (s.dashboardId as string) ?? null,
    extraction: (s.extraction as ViewState["extraction"]) ?? null,
  };
}

export function useNavigationState(
  initialTab: TabId,
  initialBiomarkerSlug: string | null
): [NavigationState, NavigationActions] {
  // Check history.state for refresh restoration
  const restored = typeof window !== "undefined"
    ? fromHistoryState(window.history.state)
    : null;

  const effectiveTab = restored?.tab ?? initialTab;
  const effectiveBiomarker = restored?.biomarkerSlug ?? initialBiomarkerSlug;
  const effectiveDashboard = restored?.dashboardId ?? null;

  const [activeTab, setActiveTab] = useState<TabId>(effectiveTab);
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(
    new Set([effectiveTab])
  );
  const [biomarkerSlug, setBiomarkerSlug] = useState<string | null>(effectiveBiomarker);
  const [dashboardId, setDashboardId] = useState<string | null>(effectiveDashboard);
  const [extractionMode, setExtractionMode] = useState<
    { type: "new" } | { type: "view"; file: StoredFile } | null
  >(null);

  // Keep a ref to extractionMode so popstate can read it without stale closure
  const extractionRef = useRef(extractionMode);
  extractionRef.current = extractionMode;

  const ensureMounted = useCallback((tab: TabId) => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      return new Set(prev).add(tab);
    });
  }, []);

  // Stamp initial history entry on mount
  useEffect(() => {
    const vs: ViewState = {
      tab: effectiveTab,
      biomarkerSlug: effectiveBiomarker,
      dashboardId: effectiveDashboard,
      extraction: null,
    };
    window.history.replaceState(toHistoryState(vs), "", "/");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pushView = useCallback((vs: ViewState) => {
    window.history.pushState(toHistoryState(vs), "", "/");
  }, []);

  // --- Navigation actions ---

  const switchTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      setBiomarkerSlug(null);
      setDashboardId(null);
      setExtractionMode(null);
      ensureMounted(tab);
      pushView({ tab, biomarkerSlug: null, dashboardId: null, extraction: null });
    },
    [pushView, ensureMounted]
  );

  const openBiomarker = useCallback(
    (slug: string) => {
      setActiveTab("biomarkers");
      setBiomarkerSlug(slug);
      setDashboardId(null);
      setExtractionMode(null);
      ensureMounted("biomarkers");
      pushView({ tab: "biomarkers", biomarkerSlug: slug, dashboardId: null, extraction: null });
    },
    [pushView, ensureMounted]
  );

  const openDashboard = useCallback(
    (id: string) => {
      setActiveTab("dashboards");
      setDashboardId(id);
      setBiomarkerSlug(null);
      setExtractionMode(null);
      ensureMounted("dashboards");
      pushView({ tab: "dashboards", biomarkerSlug: null, dashboardId: id, extraction: null });
    },
    [pushView, ensureMounted]
  );

  const openExtraction = useCallback(
    (mode: { type: "new" } | { type: "view"; file: StoredFile }) => {
      setExtractionMode(mode);
      pushView({
        tab: "files",
        biomarkerSlug: null,
        dashboardId: null,
        extraction: { type: mode.type },
      });
    },
    [pushView]
  );

  // --- Popstate listener ---

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const viewState = fromHistoryState(event.state);
      if (!viewState) {
        // Not our state — user went back past our app
        setActiveTab("files");
        setBiomarkerSlug(null);
        setDashboardId(null);
        setExtractionMode(null);
        return;
      }

      setActiveTab(viewState.tab);
      ensureMounted(viewState.tab);
      setBiomarkerSlug(viewState.biomarkerSlug);
      setDashboardId(viewState.dashboardId);

      // Extraction: only restore if we still have the mode in memory
      if (viewState.extraction && extractionRef.current) {
        // Keep current extractionMode (it has the full StoredFile)
      } else {
        setExtractionMode(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [ensureMounted]);

  return [
    { activeTab, biomarkerSlug, dashboardId, extractionMode, mountedTabs },
    { switchTab, openBiomarker, openDashboard, openExtraction },
  ];
}

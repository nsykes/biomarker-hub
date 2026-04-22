"use client";

import { useCallback } from "react";
import { FilesTab } from "@/components/FilesTab";
import { BiomarkersTab } from "@/components/BiomarkersTab";
import { DashboardsTab } from "@/components/DashboardsTab";
import { GoalsTab } from "@/components/GoalsTab";
import { ExtractionView } from "@/components/ExtractionView";
import { BottomTabBar } from "@/components/BottomTabBar";
import type { ModuleContext } from "@/modules/types";
import { useBiomarkerNav } from "./useBiomarkerNav";
import { BIOMARKER_TABS } from "./tabs";
import type { BiomarkerModuleState } from "./types";

export function BiomarkerModule({
  state,
  setState,
}: ModuleContext<BiomarkerModuleState>) {
  const { mountedTabs, extractionFile, actions } = useBiomarkerNav(state, setState);

  const goBack = useCallback(() => window.history.back(), []);

  if (state.extraction) {
    const mode =
      state.extraction.type === "view" && extractionFile
        ? { type: "view" as const, file: extractionFile }
        : { type: "new" as const };
    return <ExtractionView mode={mode} onBack={goBack} />;
  }

  return (
    <>
      {/* Desktop tab strip — mobile uses BottomTabBar */}
      <nav
        className="hidden md:flex items-center justify-center px-6 py-3 border-b border-[var(--color-border-light)] flex-shrink-0"
        style={{ background: "var(--color-header-bg)", boxShadow: "var(--color-header-shadow)" }}
        aria-label="Biomarker views"
      >
        <div className="flex gap-1 bg-[var(--color-surface-tertiary)] rounded-full p-0.5">
          {BIOMARKER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => actions.switchTab(tab.id)}
              onMouseEnter={() => actions.ensureMounted(tab.id)}
              onFocus={() => actions.ensureMounted(tab.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                state.activeTab === tab.id
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-auto bg-[var(--color-surface-secondary)]">
        <div className={state.activeTab === "files" ? "h-full" : "hidden"}>
          {mountedTabs.has("files") && (
            <FilesTab
              onNewExtraction={() => actions.openExtraction({ type: "new" })}
              onViewFile={(file) => actions.openExtraction({ type: "view", file })}
            />
          )}
        </div>
        <div className={state.activeTab === "biomarkers" ? "h-full" : "hidden"}>
          {mountedTabs.has("biomarkers") && (
            <BiomarkersTab
              activeBiomarkerSlug={state.biomarkerSlug}
              onOpenBiomarker={actions.openBiomarker}
              onBack={goBack}
            />
          )}
        </div>
        <div className={state.activeTab === "dashboards" ? "h-full" : "hidden"}>
          {mountedTabs.has("dashboards") && (
            <DashboardsTab
              activeDashboardId={state.dashboardId}
              onOpenDashboard={actions.openDashboard}
              onBack={goBack}
              onNavigateToBiomarker={actions.openBiomarker}
            />
          )}
        </div>
        <div className={state.activeTab === "goals" ? "h-full" : "hidden"}>
          {mountedTabs.has("goals") && (
            <GoalsTab onNavigateToBiomarker={actions.openBiomarker} />
          )}
        </div>
      </main>

      <BottomTabBar
        tabs={BIOMARKER_TABS}
        activeTabId={state.activeTab}
        onSelect={actions.switchTab}
        onPrefetch={actions.ensureMounted}
      />
    </>
  );
}

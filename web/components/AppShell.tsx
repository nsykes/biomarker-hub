"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TabId } from "@/lib/types";
import { useNavigationState } from "@/hooks/useNavigationState";
import { ThemeToggle } from "./ThemeToggle";
import { FilesTab } from "./FilesTab";
import { BiomarkersTab } from "./BiomarkersTab";
import { DashboardsTab } from "./DashboardsTab";
import { SettingsTab } from "./SettingsTab";
import { ExtractionView } from "./ExtractionView";

const TABS: { id: TabId; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "biomarkers", label: "Biomarkers" },
  { id: "dashboards", label: "Dashboards" },
  { id: "settings", label: "Settings" },
];

const VALID_TABS = TABS.map((t) => t.id);

export function AppShell() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const biomarkerParam = searchParams.get("biomarker");
  const initialTab: TabId =
    tabParam && VALID_TABS.includes(tabParam as TabId)
      ? (tabParam as TabId)
      : "files";

  const [state, nav] = useNavigationState(initialTab, biomarkerParam);

  const goBack = useCallback(() => window.history.back(), []);

  if (state.extractionMode) {
    return (
      <ExtractionView
        mode={state.extractionMode}
        onBack={goBack}
      />
    );
  }

  return (
    <>
      {/* Header — frosted glass */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border-light)] backdrop-blur-lg flex-shrink-0" style={{ background: 'var(--color-header-bg)', boxShadow: 'var(--color-header-shadow)' }}>
        <img src="/logo.svg" alt="Biomarker Hub" className="h-10" />
        <nav className="flex gap-1 bg-[var(--color-surface-tertiary)] rounded-full p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => nav.switchTab(tab.id)}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200
                ${
                  state.activeTab === tab.id
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-secondary)]">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </div>
      </header>

      {/* Tab content — lazy-mount: tabs mount on first activation, stay mounted (hidden via CSS) */}
      <main className="flex-1 overflow-auto bg-[var(--color-surface-secondary)]">
        <div className={state.activeTab === "files" ? "h-full" : "hidden"}>
          {state.mountedTabs.has("files") && (
            <FilesTab
              onNewExtraction={() => nav.openExtraction({ type: "new" })}
              onViewFile={(file) => nav.openExtraction({ type: "view", file })}
            />
          )}
        </div>
        <div className={state.activeTab === "biomarkers" ? "h-full" : "hidden"}>
          {state.mountedTabs.has("biomarkers") && (
            <BiomarkersTab
              activeBiomarkerSlug={state.biomarkerSlug}
              onOpenBiomarker={nav.openBiomarker}
              onBack={goBack}
            />
          )}
        </div>
        <div className={state.activeTab === "dashboards" ? "h-full" : "hidden"}>
          {state.mountedTabs.has("dashboards") && (
            <DashboardsTab
              activeDashboardId={state.dashboardId}
              onOpenDashboard={nav.openDashboard}
              onBack={goBack}
              onNavigateToBiomarker={nav.openBiomarker}
            />
          )}
        </div>
        <div className={state.activeTab === "settings" ? "h-full" : "hidden"}>
          {state.mountedTabs.has("settings") && <SettingsTab />}
        </div>
      </main>
    </>
  );
}

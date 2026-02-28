"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { UserButton } from "@neondatabase/auth/react";
import { TabId, StoredFile } from "@/lib/types";
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

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(
    new Set([initialTab])
  );
  const [initialBiomarkerSlug] = useState<string | null>(biomarkerParam);

  const handleTabSwitch = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setMountedTabs((prev: Set<TabId>) => {
      if (prev.has(tabId)) return prev;
      return new Set(prev).add(tabId);
    });
  }, []);

  // Clear search params from URL after reading them so a refresh always lands on Files
  useEffect(() => {
    if (tabParam || biomarkerParam) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const [extractionMode, setExtractionMode] = useState<
    | { type: "new" }
    | { type: "view"; file: StoredFile }
    | null
  >(null);

  const handleNewExtraction = useCallback(() => {
    setExtractionMode({ type: "new" });
  }, []);

  const handleViewFile = useCallback((file: StoredFile) => {
    setExtractionMode({ type: "view", file });
  }, []);

  const handleBack = useCallback(() => {
    setExtractionMode(null);
  }, []);

  if (extractionMode) {
    return (
      <ExtractionView
        mode={extractionMode}
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      {/* Header — frosted glass */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border-light)] bg-white/80 backdrop-blur-lg flex-shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <img src="/logo.svg" alt="Biomarker Hub" className="h-10" />
        <nav className="flex gap-1 bg-[var(--color-surface-tertiary)] rounded-full p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200
                ${
                  activeTab === tab.id
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto">
          <UserButton size="icon" disableDefaultLinks />
        </div>
      </header>

      {/* Tab content — lazy-mount: tabs mount on first activation, stay mounted (hidden via CSS) */}
      <main className="flex-1 overflow-auto bg-[var(--color-surface-secondary)]">
        <div className={activeTab === "files" ? "h-full" : "hidden"}>
          {mountedTabs.has("files") && (
            <FilesTab
              onNewExtraction={handleNewExtraction}
              onViewFile={handleViewFile}
            />
          )}
        </div>
        <div className={activeTab === "biomarkers" ? "h-full" : "hidden"}>
          {mountedTabs.has("biomarkers") && (
            <BiomarkersTab initialBiomarkerSlug={initialBiomarkerSlug} />
          )}
        </div>
        <div className={activeTab === "dashboards" ? "h-full" : "hidden"}>
          {mountedTabs.has("dashboards") && <DashboardsTab />}
        </div>
        <div className={activeTab === "settings" ? "h-full" : "hidden"}>
          {mountedTabs.has("settings") && <SettingsTab />}
        </div>
      </main>
    </>
  );
}

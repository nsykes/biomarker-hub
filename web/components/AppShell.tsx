"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { TabId, StoredFile } from "@/lib/types";
import { FilesTab } from "./FilesTab";
import { BiomarkersTab } from "./BiomarkersTab";
import { SettingsTab } from "./SettingsTab";

const ExtractionView = dynamic(
  () =>
    import("@/components/ExtractionView").then((mod) => ({
      default: mod.ExtractionView,
    })),
  { ssr: false }
);

const TABS: { id: TabId; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "biomarkers", label: "Biomarkers" },
  { id: "settings", label: "Settings" },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("files");
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
      {/* Header */}
      <header className="flex items-center gap-6 px-5 py-3 border-b bg-white flex-shrink-0">
        <h1 className="text-lg font-bold tracking-tight">Biomarker Extract</h1>
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-auto">
        {activeTab === "files" && (
          <FilesTab
            onNewExtraction={handleNewExtraction}
            onViewFile={handleViewFile}
          />
        )}
        {activeTab === "biomarkers" && <BiomarkersTab />}
        {activeTab === "settings" && <SettingsTab />}
      </main>
    </>
  );
}

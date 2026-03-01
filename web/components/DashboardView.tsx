"use client";

import { useState } from "react";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { PageSpinner } from "./Spinner";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { DashboardGrid } from "./dashboard/DashboardGrid";
import { DashboardEmptyState } from "./dashboard/DashboardEmptyState";
import { useDashboardData } from "@/hooks/useDashboardData";

interface DashboardViewProps {
  dashboardId: string;
  onBack: () => void;
  onNavigateToBiomarker: (slug: string) => void;
}

export function DashboardView({ dashboardId, onBack, onNavigateToBiomarker }: DashboardViewProps) {
  const {
    dashboard,
    loading,
    items,
    cardEntries,
    handleNameSave,
    handleDelete,
    handleAddBiomarker,
    handleRemoveItem,
    handleDragEnd,
    handleMerge,
    handleUngroup,
  } = useDashboardData(dashboardId, onBack);

  const [showCombobox, setShowCombobox] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onMerge = async () => {
    await handleMerge(selectedItemIds);
    setSelectedItemIds(new Set());
    setMergeMode(false);
  };

  const onAddBiomarker = async (entry: Parameters<typeof handleAddBiomarker>[0]) => {
    setShowCombobox(false);
    await handleAddBiomarker(entry);
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (!dashboard) return null;

  return (
    <div className="overflow-auto h-full">
      <DashboardHeader
        name={dashboard.name}
        onBack={onBack}
        onNameSave={handleNameSave}
        onDelete={handleDelete}
        onAddClick={() => setShowCombobox(true)}
        itemCount={items.length}
        mergeMode={mergeMode}
        onToggleMerge={() => {
          setMergeMode((m) => !m);
          setSelectedItemIds(new Set());
        }}
      />

      {/* Combobox overlay */}
      {showCombobox && (
        <div className="px-5 py-3 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]">
          <BiomarkerCombobox
            onSelect={onAddBiomarker}
            onClose={() => setShowCombobox(false)}
          />
        </div>
      )}

      {/* Merge mode instructions */}
      {mergeMode && (
        <div className="mx-4 mt-4 px-4 py-2.5 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)] text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Select 2 or more charts to merge into a single overlay view</span>
        </div>
      )}

      {/* Chart grid */}
      <div className="p-4">
        {items.length === 0 ? (
          <DashboardEmptyState onAddClick={() => setShowCombobox(true)} />
        ) : (
          <DashboardGrid
            items={items}
            cardEntries={cardEntries}
            mergeMode={mergeMode}
            selectedItemIds={selectedItemIds}
            onDragEnd={handleDragEnd}
            onRemoveItem={handleRemoveItem}
            onUngroup={handleUngroup}
            onNavigate={onNavigateToBiomarker}
            onToggleSelect={toggleSelectItem}
            onMerge={onMerge}
          />
        )}
      </div>
    </div>
  );
}

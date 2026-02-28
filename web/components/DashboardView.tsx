"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  DashboardDetail,
  DashboardItem,
  DashboardCardEntry,
  BiomarkerDetailData,
} from "@/lib/types";
import {
  getDashboard,
  getDashboardChartData,
  updateDashboard,
  deleteDashboard,
  addDashboardItem,
  removeDashboardItem,
  reorderDashboardItems,
  groupDashboardItems,
  ungroupDashboardItems,
} from "@/lib/db/actions";
import { CanonicalBiomarker } from "@/lib/biomarker-registry";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { DashboardChartCard } from "./DashboardChartCard";
import { MultiMetricChartCard } from "./MultiMetricChartCard";
import { PageSpinner } from "./Spinner";

function buildCardEntries(
  items: DashboardItem[],
  chartData: Map<string, BiomarkerDetailData>
): DashboardCardEntry[] {
  const groups = new Map<string, DashboardItem[]>();
  const singles: DashboardItem[] = [];

  for (const item of items) {
    if (item.groupId) {
      const list = groups.get(item.groupId) || [];
      list.push(item);
      groups.set(item.groupId, list);
    } else {
      singles.push(item);
    }
  }

  const entries: DashboardCardEntry[] = [];

  for (const item of singles) {
    const data = chartData.get(item.canonicalSlug);
    if (!data) continue;
    entries.push({
      type: "single",
      itemId: item.id,
      slug: item.canonicalSlug,
      data,
      sortOrder: item.sortOrder,
    });
  }

  for (const [groupId, groupItems] of groups) {
    const dataList = groupItems
      .map((i) => chartData.get(i.canonicalSlug))
      .filter(Boolean) as BiomarkerDetailData[];
    if (dataList.length === 0) continue;
    entries.push({
      type: "group",
      groupId,
      items: groupItems.map((i) => ({ itemId: i.id, slug: i.canonicalSlug })),
      dataList,
      sortOrder: Math.min(...groupItems.map((i) => i.sortOrder)),
    });
  }

  return entries.sort((a, b) => a.sortOrder - b.sortOrder);
}

interface DashboardViewProps {
  dashboardId: string;
  onBack: () => void;
  onNavigateToBiomarker: (slug: string) => void;
}

export function DashboardView({ dashboardId, onBack, onNavigateToBiomarker }: DashboardViewProps) {
  const [dashboard, setDashboard] = useState<DashboardDetail | null>(null);
  const [chartData, setChartData] = useState<Map<string, BiomarkerDetailData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showCombobox, setShowCombobox] = useState(false);
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = useCallback(async () => {
    try {
      const detail = await getDashboard(dashboardId);
      if (!detail) {
        onBack();
        return;
      }
      setDashboard(detail);
      setItems(detail.items);
      setNameInput(detail.name);

      const slugs = detail.items.map((i) => i.canonicalSlug);
      if (slugs.length > 0) {
        const data = await getDashboardChartData(slugs);
        const map = new Map<string, BiomarkerDetailData>();
        for (const d of data) {
          map.set(d.slug, d);
        }
        setChartData(map);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      onBack();
    } finally {
      setLoading(false);
    }
  }, [dashboardId, onBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNameSave = async () => {
    if (!nameInput.trim() || !dashboard) return;
    setEditingName(false);
    setDashboard((d) => (d ? { ...d, name: nameInput.trim() } : d));
    await updateDashboard(dashboardId, { name: nameInput.trim() });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this dashboard?")) return;
    await deleteDashboard(dashboardId);
    onBack();
  };

  const handleAddBiomarker = async (entry: CanonicalBiomarker) => {
    setShowCombobox(false);
    if (items.some((i) => i.canonicalSlug === entry.slug)) return;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const newItem: DashboardItem = {
      id: tempId,
      canonicalSlug: entry.slug,
      sortOrder: items.length,
      groupId: null,
    };
    setItems((prev) => [...prev, newItem]);

    // Fetch chart data for the new biomarker
    const data = await getDashboardChartData([entry.slug]);
    if (data.length > 0) {
      setChartData((prev) => new Map(prev).set(entry.slug, data[0]));
    }

    // Server sync
    const realId = await addDashboardItem(dashboardId, entry.slug);
    setItems((prev) =>
      prev.map((i) => (i.id === tempId ? { ...i, id: realId } : i))
    );
  };

  const handleRemoveItem = async (item: DashboardItem) => {
    // Optimistic update
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await removeDashboardItem(dashboardId, item.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cardEntries.findIndex((e) =>
      e.type === "single" ? e.itemId === active.id : e.groupId === active.id
    );
    const newIndex = cardEntries.findIndex((e) =>
      e.type === "single" ? e.itemId === over.id : e.groupId === over.id
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(cardEntries, oldIndex, newIndex);
    // Flatten back to items with updated sort orders
    const newItems: DashboardItem[] = [];
    let sortIdx = 0;
    for (const entry of reordered) {
      if (entry.type === "single") {
        const item = items.find((i) => i.id === entry.itemId);
        if (item) newItems.push({ ...item, sortOrder: sortIdx++ });
      } else {
        for (const gi of entry.items) {
          const item = items.find((i) => i.id === gi.itemId);
          if (item) newItems.push({ ...item, sortOrder: sortIdx++ });
        }
      }
    }
    setItems(newItems);

    await reorderDashboardItems(
      dashboardId,
      newItems.map((i) => i.id)
    );
  };

  const handleNavigate = (slug: string) => {
    onNavigateToBiomarker(slug);
  };

  const cardEntries = useMemo(
    () => buildCardEntries(items, chartData),
    [items, chartData]
  );

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMerge = async () => {
    if (selectedItemIds.size < 2) return;
    const ids = Array.from(selectedItemIds);
    // Optimistic: assign a temporary groupId
    const tempGroupId = crypto.randomUUID();
    setItems((prev) =>
      prev.map((i) =>
        ids.includes(i.id) ? { ...i, groupId: tempGroupId } : i
      )
    );
    setSelectedItemIds(new Set());
    setMergeMode(false);
    await groupDashboardItems(dashboardId, ids);
    // Reload to get real groupId
    loadData();
  };

  const handleUngroup = async (groupId: string) => {
    // Optimistic
    setItems((prev) =>
      prev.map((i) => (i.groupId === groupId ? { ...i, groupId: null } : i))
    );
    await ungroupDashboardItems(dashboardId, groupId);
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (!dashboard) return null;

  return (
    <div className="overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)] flex-shrink-0"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {editingName ? (
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
              if (e.key === "Escape") {
                setNameInput(dashboard.name);
                setEditingName(false);
              }
            }}
            className="input-base rounded-lg text-lg font-semibold !py-1 flex-1 max-w-xs"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors truncate"
            title="Click to rename"
          >
            {dashboard.name}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {items.length >= 2 && (
            <button
              onClick={() => {
                setMergeMode((m) => !m);
                setSelectedItemIds(new Set());
              }}
              className={`btn-secondary text-sm ${mergeMode ? "!bg-[var(--color-primary-light)] !text-[var(--color-primary)] !border-[var(--color-primary)]" : ""}`}
            >
              {mergeMode ? "Cancel" : "Merge"}
            </button>
          )}
          <button
            onClick={() => setShowCombobox(true)}
            className="btn-secondary text-sm"
          >
            + Add Biomarker
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-[var(--color-error-bg)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors"
            title="Delete dashboard"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Combobox overlay */}
      {showCombobox && (
        <div className="px-5 py-3 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]">
          <BiomarkerCombobox
            onSelect={handleAddBiomarker}
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
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-tertiary)] gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
              <svg
                className="w-7 h-7 text-[var(--color-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">
                No biomarkers yet
              </p>
              <p className="text-sm mt-1">
                Add biomarkers to see their charts here
              </p>
            </div>
            <button
              onClick={() => setShowCombobox(true)}
              className="btn-primary text-sm mt-1"
            >
              + Add Biomarker
            </button>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={cardEntries.map((e) =>
                  e.type === "single" ? e.itemId : e.groupId
                )}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cardEntries.map((entry) => {
                    if (entry.type === "group") {
                      return (
                        <MultiMetricChartCard
                          key={entry.groupId}
                          groupId={entry.groupId}
                          dataList={entry.dataList}
                          onUngroup={() => handleUngroup(entry.groupId)}
                          onNavigate={handleNavigate}
                        />
                      );
                    }
                    return (
                      <div
                        key={entry.itemId}
                        className={`relative ${
                          mergeMode && selectedItemIds.has(entry.itemId)
                            ? "ring-2 ring-[var(--color-primary)] rounded-xl"
                            : ""
                        }`}
                      >
                        {mergeMode && (
                          <div
                            onClick={() => toggleSelectItem(entry.itemId)}
                            className="absolute inset-0 z-20 cursor-pointer rounded-xl"
                          >
                            <div
                              className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                selectedItemIds.has(entry.itemId)
                                  ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                                  : "bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]"
                              }`}
                            >
                              {selectedItemIds.has(entry.itemId) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                        <DashboardChartCard
                          itemId={entry.itemId}
                          data={entry.data}
                          onRemove={() => {
                            const item = items.find((i) => i.id === entry.itemId);
                            if (item) handleRemoveItem(item);
                          }}
                          onNavigate={handleNavigate}
                        />
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* Merge floating bar */}
            {mergeMode && selectedItemIds.size >= 2 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <button
                  onClick={handleMerge}
                  className="btn-primary shadow-xl px-6 py-3 rounded-full text-sm font-semibold"
                >
                  Merge {selectedItemIds.size} charts
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

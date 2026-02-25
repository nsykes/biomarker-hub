"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "@/lib/db/actions";
import { CanonicalBiomarker } from "@/lib/biomarker-registry";
import { BiomarkerCombobox } from "./BiomarkerCombobox";
import { DashboardChartCard } from "./DashboardChartCard";
import { PageSpinner } from "./Spinner";

interface DashboardViewProps {
  dashboardId: string;
  onBack: () => void;
}

export function DashboardView({ dashboardId, onBack }: DashboardViewProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardDetail | null>(null);
  const [chartData, setChartData] = useState<Map<string, BiomarkerDetailData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showCombobox, setShowCombobox] = useState(false);
  const [items, setItems] = useState<DashboardItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = useCallback(async () => {
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
    setLoading(false);
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

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    await reorderDashboardItems(
      dashboardId,
      reordered.map((i) => i.id)
    );
  };

  const handleNavigate = (slug: string) => {
    router.push(`/biomarkers/${slug}`);
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (!dashboard) return null;

  return (
    <div className="overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-light)] bg-white sticky top-0 z-10">
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
          <button
            onClick={() => setShowCombobox(true)}
            className="btn-secondary text-sm"
          >
            + Add Biomarker
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-[#FDE8E8] text-[var(--color-text-tertiary)] hover:text-[#FF3B30] transition-colors"
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
        <div className="px-5 py-3 border-b border-[var(--color-border-light)] bg-white">
          <BiomarkerCombobox
            onSelect={handleAddBiomarker}
            onClose={() => setShowCombobox(false)}
          />
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => {
                  const data = chartData.get(item.canonicalSlug);
                  if (!data) return null;
                  return (
                    <DashboardChartCard
                      key={item.id}
                      itemId={item.id}
                      data={data}
                      onRemove={() => handleRemoveItem(item)}
                      onNavigate={handleNavigate}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

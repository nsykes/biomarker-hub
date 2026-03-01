import { useState, useCallback, useEffect, useMemo } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
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

export function useDashboardData(dashboardId: string, onBack: () => void) {
  const [dashboard, setDashboard] = useState<DashboardDetail | null>(null);
  const [chartData, setChartData] = useState<Map<string, BiomarkerDetailData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DashboardItem[]>([]);

  const cardEntries = useMemo(
    () => buildCardEntries(items, chartData),
    [items, chartData]
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

  const handleNameSave = useCallback(
    async (nameInput: string) => {
      if (!nameInput.trim() || !dashboard) return;
      setDashboard((d) => (d ? { ...d, name: nameInput.trim() } : d));
      await updateDashboard(dashboardId, { name: nameInput.trim() });
    },
    [dashboard, dashboardId]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this dashboard?")) return;
    await deleteDashboard(dashboardId);
    onBack();
  }, [dashboardId, onBack]);

  const handleAddBiomarker = useCallback(
    async (entry: CanonicalBiomarker) => {
      if (items.some((i) => i.canonicalSlug === entry.slug)) return;

      const tempId = crypto.randomUUID();
      const newItem: DashboardItem = {
        id: tempId,
        canonicalSlug: entry.slug,
        sortOrder: items.length,
        groupId: null,
      };
      setItems((prev) => [...prev, newItem]);

      const data = await getDashboardChartData([entry.slug]);
      if (data.length > 0) {
        setChartData((prev) => new Map(prev).set(entry.slug, data[0]));
      }

      const realId = await addDashboardItem(dashboardId, entry.slug);
      setItems((prev) =>
        prev.map((i) => (i.id === tempId ? { ...i, id: realId } : i))
      );
    },
    [items, dashboardId]
  );

  const handleRemoveItem = useCallback(
    async (item: DashboardItem) => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      await removeDashboardItem(dashboardId, item.id);
    },
    [dashboardId]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
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
    },
    [cardEntries, items, dashboardId]
  );

  const handleMerge = useCallback(
    async (selectedItemIds: Set<string>) => {
      if (selectedItemIds.size < 2) return;
      const ids = Array.from(selectedItemIds);
      const tempGroupId = crypto.randomUUID();
      setItems((prev) =>
        prev.map((i) =>
          ids.includes(i.id) ? { ...i, groupId: tempGroupId } : i
        )
      );
      await groupDashboardItems(dashboardId, ids);
      loadData();
    },
    [dashboardId, loadData]
  );

  const handleUngroup = useCallback(
    async (groupId: string) => {
      setItems((prev) =>
        prev.map((i) => (i.groupId === groupId ? { ...i, groupId: null } : i))
      );
      await ungroupDashboardItems(dashboardId, groupId);
    },
    [dashboardId]
  );

  return {
    dashboard,
    loading,
    items,
    cardEntries,
    loadData,
    handleNameSave,
    handleDelete,
    handleAddBiomarker,
    handleRemoveItem,
    handleDragEnd,
    handleMerge,
    handleUngroup,
  };
}

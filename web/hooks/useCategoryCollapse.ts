"use client";

import { useState, useCallback } from "react";

export function useCategoryCollapse() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = useCallback((category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const isCollapsed = useCallback(
    (category: string) => collapsed.has(category),
    [collapsed]
  );

  const expandAll = useCallback(() => {
    setCollapsed(new Set());
  }, []);

  const collapseAll = useCallback((categories: string[]) => {
    setCollapsed(new Set(categories));
  }, []);

  const anyCollapsed = collapsed.size > 0;

  return { toggle, isCollapsed, expandAll, collapseAll, anyCollapsed };
}

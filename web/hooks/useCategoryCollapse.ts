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

  return { toggle, isCollapsed };
}

"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const DEFAULTS = {
  grid: "#F0F0F5",
  axis: "#E5E5EA",
  tick: "#AEAEB2",
  primary: "#0A84FF",
  surface: "#FFFFFF",
  refLine: "#AEAEB2",
};

export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState(DEFAULTS);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    setColors({
      grid: cs.getPropertyValue("--color-border-light").trim() || DEFAULTS.grid,
      axis: cs.getPropertyValue("--color-border").trim() || DEFAULTS.axis,
      tick: cs.getPropertyValue("--color-text-tertiary").trim() || DEFAULTS.tick,
      primary: cs.getPropertyValue("--color-primary").trim() || DEFAULTS.primary,
      surface: cs.getPropertyValue("--color-surface").trim() || DEFAULTS.surface,
      refLine: cs.getPropertyValue("--color-text-tertiary").trim() || DEFAULTS.refLine,
    });
  }, [resolvedTheme]);

  return colors;
}

"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (callback: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };
}

/**
 * Reactive media-query hook. Returns `false` during SSR and on the very first
 * client render so server and client HTML match (no hydration warning); the
 * real value is read after the first effect commits and the component
 * re-renders. On desktop this means the mobile branch flashes briefly before
 * the desktop branch takes over — acceptable trade-off for this app since
 * only `SplitPane` (the extraction view) gates layout on this hook, and the
 * extraction view isn't in the initial paint of any common entry path.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

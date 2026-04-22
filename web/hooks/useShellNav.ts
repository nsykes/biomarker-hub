"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModuleDef } from "@/modules/types";

const SENTINEL = "_hubNav";
export const SETTINGS_VIEW_ID = "settings";

export type ShellViewId = string;

interface HubHistoryState {
  [SENTINEL]: true;
  activeViewId: ShellViewId;
  moduleStates: Record<string, unknown>;
}

function isHubHistoryState(raw: unknown): raw is HubHistoryState {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      (raw as Record<string, unknown>)[SENTINEL] === true
  );
}

interface ParseResult {
  activeViewId: ShellViewId;
  moduleStates: Record<string, unknown>;
}

function parseFromSearch(
  search: string,
  modules: ReadonlyArray<ModuleDef<unknown>>,
  fallbackModuleId: string
): ParseResult {
  const params = new URLSearchParams(search);
  const m = params.get("m");

  const activeViewId: ShellViewId =
    m === SETTINGS_VIEW_ID
      ? SETTINGS_VIEW_ID
      : modules.find((mod) => mod.id === m)?.id ?? fallbackModuleId;

  const moduleStates: Record<string, unknown> = {};
  for (const mod of modules) {
    moduleStates[mod.id] =
      mod.id === activeViewId ? mod.parseUrlState(params) : mod.initialState;
  }

  return { activeViewId, moduleStates };
}

function buildUrl(
  activeViewId: ShellViewId,
  moduleStates: Record<string, unknown>,
  modules: ReadonlyArray<ModuleDef<unknown>>
): string {
  const params = new URLSearchParams();
  params.set("m", activeViewId);

  if (activeViewId !== SETTINGS_VIEW_ID) {
    const mod = modules.find((m) => m.id === activeViewId);
    if (mod) {
      const state = moduleStates[activeViewId];
      const moduleParams = mod.stringifyUrlState(state);
      for (const [key, value] of Object.entries(moduleParams)) {
        params.set(key, value);
      }
    }
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function toHistoryState(
  activeViewId: ShellViewId,
  moduleStates: Record<string, unknown>
): HubHistoryState {
  return { [SENTINEL]: true, activeViewId, moduleStates };
}

export interface ShellNav {
  activeViewId: ShellViewId;
  moduleStates: Record<string, unknown>;
  mountedViews: Set<string>;
  activeModule: ModuleDef<unknown> | null;
  switchView: (id: ShellViewId) => void;
  setModuleState: (moduleId: string, state: unknown) => void;
  mobileDrawerOpen: boolean;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
}

export function useShellNav(
  modules: ReadonlyArray<ModuleDef<unknown>>
): ShellNav {
  const fallbackModuleId = modules[0]?.id ?? SETTINGS_VIEW_ID;

  const initial = useMemo<ParseResult>(() => {
    if (typeof window === "undefined") {
      return {
        activeViewId: fallbackModuleId,
        moduleStates: Object.fromEntries(
          modules.map((m) => [m.id, m.initialState])
        ),
      };
    }
    const fromHistory = isHubHistoryState(window.history.state)
      ? {
          activeViewId: window.history.state.activeViewId,
          moduleStates: {
            ...Object.fromEntries(modules.map((m) => [m.id, m.initialState])),
            ...window.history.state.moduleStates,
          },
        }
      : null;
    return (
      fromHistory ??
      parseFromSearch(window.location.search, modules, fallbackModuleId)
    );
  }, [modules, fallbackModuleId]);

  const [activeViewId, setActiveViewId] = useState<ShellViewId>(
    initial.activeViewId
  );
  const [moduleStates, setModuleStatesState] = useState<Record<string, unknown>>(
    initial.moduleStates
  );
  const [mountedViews, setMountedViews] = useState<Set<string>>(
    () => new Set<string>([initial.activeViewId])
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const latest = useRef({ activeViewId, moduleStates });
  latest.current = { activeViewId, moduleStates };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.replaceState(
      toHistoryState(activeViewId, moduleStates),
      "",
      buildUrl(activeViewId, moduleStates, modules)
    );
    // Only run once on mount to stamp initial state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureMounted = useCallback((id: string) => {
    setMountedViews((prev) => {
      if (prev.has(id)) return prev;
      return new Set(prev).add(id);
    });
  }, []);

  const pushEntry = useCallback(
    (nextView: ShellViewId, nextStates: Record<string, unknown>) => {
      if (typeof window === "undefined") return;
      window.history.pushState(
        toHistoryState(nextView, nextStates),
        "",
        buildUrl(nextView, nextStates, modules)
      );
    },
    [modules]
  );

  const switchView = useCallback(
    (id: ShellViewId) => {
      setActiveViewId(id);
      ensureMounted(id);
      pushEntry(id, latest.current.moduleStates);
      setMobileDrawerOpen(false);
    },
    [ensureMounted, pushEntry]
  );

  const setModuleState = useCallback(
    (moduleId: string, state: unknown) => {
      setModuleStatesState((prev) => {
        const next = { ...prev, [moduleId]: state };
        const viewId = latest.current.activeViewId;
        // Only push history when setting the active module's state.
        if (viewId === moduleId) {
          pushEntry(viewId, next);
        }
        return next;
      });
    },
    [pushEntry]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = (event: PopStateEvent) => {
      if (isHubHistoryState(event.state)) {
        setActiveViewId(event.state.activeViewId);
        ensureMounted(event.state.activeViewId);
        setModuleStatesState({
          ...Object.fromEntries(modules.map((m) => [m.id, m.initialState])),
          ...event.state.moduleStates,
        });
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [modules, ensureMounted]);

  const activeModule = useMemo(
    () =>
      activeViewId === SETTINGS_VIEW_ID
        ? null
        : modules.find((m) => m.id === activeViewId) ?? null,
    [activeViewId, modules]
  );

  return {
    activeViewId,
    moduleStates,
    mountedViews,
    activeModule,
    switchView,
    setModuleState,
    mobileDrawerOpen,
    openMobileDrawer: useCallback(() => setMobileDrawerOpen(true), []),
    closeMobileDrawer: useCallback(() => setMobileDrawerOpen(false), []),
  };
}

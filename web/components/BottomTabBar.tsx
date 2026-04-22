"use client";

import type { ReactNode } from "react";

export interface BottomTabDef<T extends string> {
  id: T;
  label: string;
  renderIcon: (props: { active: boolean }) => ReactNode;
}

interface BottomTabBarProps<T extends string> {
  tabs: ReadonlyArray<BottomTabDef<T>>;
  activeTabId: T;
  onSelect: (id: T) => void;
  onPrefetch?: (id: T) => void;
}

export function BottomTabBar<T extends string>({
  tabs,
  activeTabId,
  onSelect,
  onPrefetch,
}: BottomTabBarProps<T>) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border-light)] backdrop-blur-lg safe-pb"
      style={{ background: "var(--color-header-bg)" }}
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <li key={tab.id} className="flex-1">
              <button
                onClick={() => onSelect(tab.id)}
                onTouchStart={() => onPrefetch?.(tab.id)}
                onFocus={() => onPrefetch?.(tab.id)}
                className={`w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {tab.renderIcon({ active })}
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

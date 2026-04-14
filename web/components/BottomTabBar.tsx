"use client";

import { TabId } from "@/lib/types";

interface TabDef {
  id: TabId;
  label: string;
}

interface BottomTabBarProps {
  tabs: TabDef[];
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
}

function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  const stroke = active ? "var(--color-primary)" : "currentColor";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "files":
      return (
        <svg {...common}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
      );
    case "biomarkers":
      return (
        <svg {...common}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );
    case "dashboards":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "goals":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill={stroke} />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

export function BottomTabBar({ tabs, activeTab, onSelect }: BottomTabBarProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border-light)] backdrop-blur-lg safe-pb"
      style={{ background: "var(--color-header-bg)" }}
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <li key={tab.id} className="flex-1">
              <button
                onClick={() => onSelect(tab.id)}
                className={`w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <TabIcon id={tab.id} active={active} />
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ModuleDef } from "@/modules/types";
import { SETTINGS_VIEW_ID, type ShellViewId } from "@/hooks/useShellNav";
import { SidebarItem } from "./SidebarItem";
import { SettingsIcon } from "./icons";

interface SidebarProps {
  modules: ReadonlyArray<ModuleDef<unknown>>;
  activeViewId: ShellViewId;
  onSelect: (id: ShellViewId) => void;
}

function BiomarkerHubMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="8 8 48 36"
      role="img"
      aria-label="Biomarker Hub"
      className="w-6 h-6"
    >
      <rect x="8" y="8" width="48" height="6" rx="3" fill="#0A84FF" opacity="0.08" />
      <rect x="20" y="8" width="24" height="6" rx="3" fill="#0A84FF" opacity="0.2" />
      <circle cx="30" cy="11" r="5" fill="#0A84FF" />
      <circle cx="30" cy="11" r="2" fill="white" />
      <rect x="8" y="22" width="48" height="6" rx="3" fill="#0A84FF" opacity="0.08" />
      <rect x="16" y="22" width="30" height="6" rx="3" fill="#0A84FF" opacity="0.2" />
      <circle cx="38" cy="25" r="5" fill="#0A84FF" opacity="0.6" />
      <circle cx="38" cy="25" r="2" fill="white" />
      <rect x="8" y="36" width="48" height="6" rx="3" fill="#0A84FF" opacity="0.08" />
      <rect x="22" y="36" width="20" height="6" rx="3" fill="#0A84FF" opacity="0.2" />
      <circle cx="34" cy="39" r="5" fill="#0A84FF" opacity="0.35" />
      <circle cx="34" cy="39" r="2" fill="white" />
    </svg>
  );
}

export function Sidebar({ modules, activeViewId, onSelect }: SidebarProps) {
  return (
    <aside className="group/sidebar hidden md:flex flex-col flex-shrink-0 w-16 hover:w-[220px] transition-[width] duration-200 ease-out border-r border-[var(--color-border-light)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center h-16 px-4 flex-shrink-0 border-b border-[var(--color-border-light)]">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          <BiomarkerHubMark />
        </div>
        <div className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 whitespace-nowrap overflow-hidden">
          <Logo className="h-6" />
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 py-3" aria-label="Modules">
        {modules.map((module) => (
          <SidebarItem
            key={module.id}
            active={activeViewId === module.id}
            icon={module.renderIcon({ active: activeViewId === module.id })}
            label={module.name}
            onClick={() => onSelect(module.id)}
          />
        ))}
      </nav>

      <div className="px-2 py-2 border-t border-[var(--color-border-light)] flex flex-col gap-1">
        <SidebarItem
          active={activeViewId === SETTINGS_VIEW_ID}
          icon={<SettingsIcon active={activeViewId === SETTINGS_VIEW_ID} />}
          label="Settings"
          onClick={() => onSelect(SETTINGS_VIEW_ID)}
        />
      </div>

      <div className="px-2 py-2 border-t border-[var(--color-border-light)] flex items-center gap-2">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <UserMenu />
        </div>
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

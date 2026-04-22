"use client";

import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ModuleDef } from "@/modules/types";
import { SETTINGS_VIEW_ID, type ShellViewId } from "@/hooks/useShellNav";
import { SidebarItem } from "./SidebarItem";
import { SettingsIcon, PinIcon } from "./icons";

interface SidebarProps {
  modules: ReadonlyArray<ModuleDef<unknown>>;
  activeViewId: ShellViewId;
  onSelect: (id: ShellViewId) => void;
  pinned: boolean;
  onTogglePin: () => void;
}

export function Sidebar({
  modules,
  activeViewId,
  onSelect,
  pinned,
  onTogglePin,
}: SidebarProps) {
  return (
    <aside
      suppressHydrationWarning
      className={`group/sidebar hidden md:flex flex-col flex-shrink-0 ${
        pinned ? "w-[220px]" : "w-16 hover:w-[220px]"
      } transition-[width] duration-200 ease-out border-r border-[var(--color-border-light)] bg-[var(--color-surface)]`}
    >
      <div className="flex items-center h-16 px-4 flex-shrink-0 border-b border-[var(--color-border-light)] overflow-hidden gap-2">
        <Logo className="h-7 flex-shrink-0" />
        <button
          onClick={onTogglePin}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          aria-pressed={pinned}
          className={`ml-auto flex-shrink-0 p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-secondary)] transition-opacity ${
            pinned ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100"
          }`}
        >
          <PinIcon filled={pinned} />
        </button>
      </div>

      <nav
        className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-hidden"
        aria-label="Modules"
      >
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

      <div className="px-2 py-2 border-t border-[var(--color-border-light)] flex flex-col gap-1 overflow-hidden">
        <SidebarItem
          active={activeViewId === SETTINGS_VIEW_ID}
          icon={<SettingsIcon active={activeViewId === SETTINGS_VIEW_ID} />}
          label="Settings"
          onClick={() => onSelect(SETTINGS_VIEW_ID)}
        />
      </div>

      <div className="px-2 py-2 border-t border-[var(--color-border-light)] flex items-center gap-2">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <UserMenu align="top-left" />
        </div>
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

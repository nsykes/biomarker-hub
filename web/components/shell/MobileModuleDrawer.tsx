"use client";

import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import type { ModuleDef } from "@/modules/types";
import { SETTINGS_VIEW_ID, type ShellViewId } from "@/hooks/useShellNav";
import { SettingsIcon } from "./icons";

interface MobileModuleDrawerProps {
  open: boolean;
  onClose: () => void;
  modules: ReadonlyArray<ModuleDef<unknown>>;
  activeViewId: ShellViewId;
  onSelect: (id: ShellViewId) => void;
}

interface DrawerItemProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function DrawerItem({ active, icon, label, onClick }: DrawerItemProps) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 h-11 px-3 rounded-lg transition-colors ${
        active
          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]"
      }`}
    >
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export function MobileModuleDrawer({
  open,
  onClose,
  modules,
  activeViewId,
  onSelect,
}: MobileModuleDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in"
        onClick={onClose}
      />
      <aside
        className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[var(--color-surface)] shadow-xl flex flex-col safe-pt"
        role="dialog"
        aria-label="Navigation"
      >
        <div className="flex items-center px-4 h-16 flex-shrink-0 border-b border-[var(--color-border-light)]">
          <Logo className="h-7" />
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3 py-3 overflow-y-auto">
          {modules.map((module) => (
            <DrawerItem
              key={module.id}
              active={activeViewId === module.id}
              icon={module.renderIcon({ active: activeViewId === module.id })}
              label={module.name}
              onClick={() => onSelect(module.id)}
            />
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-[var(--color-border-light)] safe-pb">
          <DrawerItem
            active={activeViewId === SETTINGS_VIEW_ID}
            icon={<SettingsIcon active={activeViewId === SETTINGS_VIEW_ID} />}
            label="Settings"
            onClick={() => onSelect(SETTINGS_VIEW_ID)}
          />
        </div>
      </aside>
    </div>
  );
}

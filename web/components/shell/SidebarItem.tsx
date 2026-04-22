"use client";

import type { ReactNode } from "react";

interface SidebarItemProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

export function SidebarItem({ active, icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex items-center h-10 px-3 rounded-lg transition-colors whitespace-nowrap ${
        active
          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        {icon}
      </span>
      <span className="ml-3 text-sm font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
        {label}
      </span>
    </button>
  );
}

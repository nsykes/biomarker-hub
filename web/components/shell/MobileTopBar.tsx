"use client";

import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { StandaloneRefreshButton } from "@/components/StandaloneRefreshButton";
import { HamburgerIcon } from "./icons";

interface MobileTopBarProps {
  onMenuClick: () => void;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <header
      className="md:hidden relative z-30 flex items-center gap-2 safe-pt px-3 pb-3 border-b border-[var(--color-border-light)] backdrop-blur-lg flex-shrink-0"
      style={{
        background: "var(--color-header-bg)",
        boxShadow: "var(--color-header-shadow)",
      }}
    >
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="p-2 -ml-1 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors"
      >
        <HamburgerIcon />
      </button>
      <Logo className="h-7" />
      <div className="ml-auto flex items-center gap-1">
        <StandaloneRefreshButton />
        <UserMenu />
      </div>
    </header>
  );
}

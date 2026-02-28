"use client";

import { useState, useRef, useEffect } from "react";
import { authClient } from "@/lib/auth/client";

export function UserMenu() {
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-secondary)]"
        title="Account"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-lg z-50" style={{ boxShadow: 'var(--color-modal-shadow, 0 8px 30px rgba(0,0,0,.12))' }}>
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] truncate">
              {session?.user?.email || ""}
            </p>
          </div>
          <div className="border-t border-[var(--color-border-light)]" />
          <div className="p-1.5">
            <button
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/auth/sign-in";
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

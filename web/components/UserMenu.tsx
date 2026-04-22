"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth/client";

type UserMenuAlign = "bottom-right" | "top-left";

const ALIGN_CLASSES: Record<UserMenuAlign, string> = {
  "bottom-right": "right-0 top-full mt-2",
  "top-left": "left-0 bottom-full mb-2",
};

export function UserMenu({ align = "bottom-right" }: { align?: UserMenuAlign } = {}) {
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
        <div className={`absolute ${ALIGN_CLASSES[align]} w-64 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-lg z-50`} style={{ boxShadow: 'var(--color-modal-shadow, 0 8px 30px rgba(0,0,0,.12))' }}>
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
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="md:hidden w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-lg transition-colors"
              >
                {theme === "dark" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
                {theme === "dark" ? "Switch to light" : "Switch to dark"}
              </button>
            )}
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

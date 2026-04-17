"use client";

/**
 * Refresh button visible only when the app is launched as a PWA
 * (home-screen web clip on iOS / installed PWA elsewhere) on mobile.
 * In Safari / any regular browser, users already have a native refresh;
 * in standalone mode there's no browser chrome, so we provide our own.
 *
 * Visibility:
 *   - `.standalone-only` (globals.css): `display: none` unless
 *     `(display-mode: standalone)` matches.
 *   - `md:hidden`: hidden on desktop regardless of display mode.
 */
export function StandaloneRefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="standalone-only md:hidden p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors"
      aria-label="Refresh"
      title="Refresh"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    </button>
  );
}

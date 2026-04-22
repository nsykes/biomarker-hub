"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[var(--color-surface-tertiary)] rounded ${className}`}
      aria-hidden="true"
    />
  );
}

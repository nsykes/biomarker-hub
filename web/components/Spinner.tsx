"use client";

const SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
} as const;

export function Spinner({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={`${SIZES[size]} border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin inline-block ${className}`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner />
    </div>
  );
}

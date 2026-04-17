"use client";

import { useEffect } from "react";

export default function AuthorizeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)]">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Authorization error
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          We couldn&apos;t complete the authorization request. Please return to
          the application and try again.
        </p>
        <button onClick={() => reset()} className="btn-secondary">
          Try again
        </button>
      </div>
    </div>
  );
}

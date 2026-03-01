"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function AuthorizeForm() {
  const searchParams = useSearchParams();
  const [clientName, setClientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");

  useEffect(() => {
    if (!clientId || !redirectUri) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    // Validate client and check session by calling our authorize API
    fetch(`/api/oauth/authorize?${searchParams.toString()}`)
      .then(async (res) => {
        if (res.status === 401) {
          // Not logged in — redirect to login with callback
          const callbackUrl = `/oauth/authorize?${searchParams.toString()}`;
          window.location.href = `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid request");
        } else {
          setClientName(data.client_name);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to validate authorization request");
        setLoading(false);
      });
  }, [clientId, redirectUri, searchParams]);

  async function handleAuthorize() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        }),
      });

      const data = await res.json();
      if (data.redirect_to) {
        window.location.href = data.redirect_to;
      } else {
        setError(data.error || "Authorization failed");
        setSubmitting(false);
      }
    } catch {
      setError("Authorization failed");
      setSubmitting(false);
    }
  }

  function handleDeny() {
    if (redirectUri && state) {
      window.location.href = `${redirectUri}?error=access_denied&state=${encodeURIComponent(state)}`;
    } else if (redirectUri) {
      window.location.href = `${redirectUri}?error=access_denied`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface-secondary)]">
        <p className="text-[var(--color-text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface-secondary)]">
        <div className="bg-[var(--color-surface)] rounded-xl p-8 max-w-md shadow-sm border border-[var(--color-border)]">
          <h1 className="text-lg font-semibold mb-2">Authorization Error</h1>
          <p className="text-[var(--color-text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface-secondary)]">
      <div className="bg-[var(--color-surface)] rounded-xl p-8 max-w-md w-full shadow-sm border border-[var(--color-border)]">
        <h1 className="text-lg font-semibold mb-4">Authorize Access</h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          <strong>{clientName}</strong> wants to access your biomarker data.
          This includes your lab results, biomarker history, and report metadata.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
          >
            Deny
          </button>
          <button
            onClick={handleAuthorize}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Authorizing..." : "Allow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface-secondary)]">
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      }
    >
      <AuthorizeForm />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { getSharedBiomarkerList } from "@/lib/db/actions";
import type { SharedBiomarkerSummary } from "@/lib/db/actions/doctor-shares";

interface ShareAuthFormProps {
  token: string;
  userName: string;
  onAuthenticated: (password: string, summaries: SharedBiomarkerSummary[]) => void;
}

export function ShareAuthForm({
  token,
  userName,
  onAuthenticated,
}: ShareAuthFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const result = await getSharedBiomarkerList(token, password);
      if (result === null) {
        setError("Incorrect password");
      } else {
        onAuthenticated(password, result);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] safe-pt safe-pb flex items-center justify-center bg-[var(--color-surface-secondary)]">
      <div className="w-full max-w-sm mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {userName}&apos;s Biomarkers
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-2">
            Enter the password to view biomarker data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-base w-full text-center text-lg tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-sm text-[var(--color-error)] text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={checking || !password.trim()}
            className="btn-primary w-full"
          >
            {checking ? "Checking..." : "Access Biomarkers"}
          </button>
        </form>
      </div>
    </div>
  );
}

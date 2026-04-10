"use client";

import type { Dispatch, SetStateAction } from "react";
import { DoctorShareInfo } from "@/lib/types";
import { useDoctorShares } from "@/hooks/useDoctorShares";

interface DoctorSharesSectionProps {
  sharesList: DoctorShareInfo[];
  setSharesList: Dispatch<SetStateAction<DoctorShareInfo[]>>;
  userName: string;
}

const EXPIRATION_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "never", label: "No expiration" },
];

export function DoctorSharesSection({
  sharesList,
  setSharesList,
  userName,
}: DoctorSharesSectionProps) {
  const {
    newLabel,
    setNewLabel,
    expiration,
    setExpiration,
    creating,
    newShare,
    linkCopied,
    passwordCopied,
    revokingId,
    handleCreate,
    handleRevoke,
    dismissNewShare,
    copyLink,
    copyPassword,
  } = useDoctorShares(sharesList, setSharesList);

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        Doctor Access
      </h2>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
        Give doctors read-only access to your biomarkers via a secure link.
      </p>

      {newShare ? (
        <div className="rounded-xl p-4 mb-4 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 space-y-3">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Share created
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Send both the link and password to your doctor. The password will
            only be shown once.
          </p>

          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Link
            </p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] break-all select-all">
                {newShare.link}
              </code>
              <button onClick={copyLink} className="btn-secondary flex-shrink-0">
                {linkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Password
            </p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] break-all select-all">
                {newShare.password}
              </code>
              <button
                onClick={copyPassword}
                className="btn-secondary flex-shrink-0"
              >
                {passwordCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <button
            onClick={dismissNewShare}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Doctor or clinic name"
            className="input-base flex-1"
          />
          <select
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="input-base w-32"
          >
            {EXPIRATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleCreate(userName)}
            disabled={creating || !newLabel.trim()}
            className="btn-primary"
          >
            {creating ? "Creating..." : "Share"}
          </button>
        </div>
      )}

      {sharesList.length > 0 ? (
        <div className="space-y-2">
          {sharesList.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {s.label}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Created {new Date(s.createdAt).toLocaleDateString()}
                  {s.expiresAt && (
                    <>
                      {" \u00b7 "}
                      {new Date(s.expiresAt) < new Date()
                        ? "Expired"
                        : `Expires ${new Date(s.expiresAt).toLocaleDateString()}`}
                    </>
                  )}
                  {s.lastAccessedAt && (
                    <>
                      {" \u00b7 "}
                      Last accessed{" "}
                      {new Date(s.lastAccessedAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!confirm(`Revoke access for "${s.label}"?`)) return;
                  handleRevoke(s.id);
                }}
                disabled={revokingId === s.id}
                className="text-xs font-medium text-[var(--color-error)] hover:text-[var(--color-error)]/80 flex-shrink-0"
              >
                {revokingId === s.id ? "Revoking..." : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No active shares.
        </p>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { Spinner } from "./Spinner";

interface DeleteAccountModalProps {
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteAccountModal({ onConfirm, onClose }: DeleteAccountModalProps) {
  const [input, setInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = input === "DELETE";

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-md w-full mx-4 flex flex-col" style={{ boxShadow: 'var(--color-modal-shadow)' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-error)]">Delete Account</h2>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors text-[var(--color-text-tertiary)] flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            This will permanently delete:
          </p>
          <ul className="text-sm text-[var(--color-text-secondary)] list-disc pl-5 space-y-1">
            <li>All uploaded lab reports and PDFs</li>
            <li>All extracted biomarker results</li>
            <li>Your profile and settings</li>
            <li>Your authentication account</li>
          </ul>
          <p className="text-sm font-medium text-[var(--color-error)]">
            This action is permanent and cannot be undone.
          </p>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)] block mb-1.5">
              Type <span className="font-mono font-semibold text-[var(--color-text-primary)]">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={deleting}
              placeholder="DELETE"
              className="input-base"
              autoFocus
            />
          </div>
          {error && (
            <div className="rounded-lg px-3 py-2 text-sm text-[var(--color-error-text)] bg-[var(--color-error-bg)]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border-light)] flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-white bg-[var(--color-error)] hover:bg-[var(--color-error-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting && <Spinner size="sm" />}
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

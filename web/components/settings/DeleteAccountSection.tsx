"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/db/actions";
import { authClient } from "@/lib/auth/client";
import { DeleteAccountModal } from "../DeleteAccountModal";

export function DeleteAccountSection() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <section className="card p-4 md:p-5 border-[var(--color-error)]/20">
        <h2 className="text-base font-semibold text-[var(--color-error)] mb-3">
          Delete Account
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          Permanently delete your account and all associated data, including
          reports, biomarker results, PDFs, goals, dashboards, doctor shares,
          MCP keys, and settings. This cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error-bg)]"
        >
          Delete Account
        </button>
      </section>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            const result = await deleteAccount();
            if (!result.success) {
              throw new Error(result.error ?? "Delete failed");
            }
            // Best-effort: remove the Neon Auth user record too. If this
            // fails (e.g., session already invalidated), fall back to
            // signOut so the user is at least logged out locally.
            try {
              const authRes = await authClient.deleteUser();
              if ("error" in authRes && authRes.error) {
                await authClient.signOut();
              }
            } catch {
              await authClient.signOut();
            }
            window.location.href = "/auth/sign-in";
          }}
        />
      )}
    </>
  );
}

"use client";

import type { Dispatch, SetStateAction } from "react";
import { ApiKeyInfo } from "@/lib/types";
import { useApiKeysManager } from "@/hooks/useApiKeysManager";

interface ApiKeysSectionProps {
  apiKeysList: ApiKeyInfo[];
  setApiKeysList: Dispatch<SetStateAction<ApiKeyInfo[]>>;
}

export function ApiKeysSection({ apiKeysList, setApiKeysList }: ApiKeysSectionProps) {
  const {
    newKeyName,
    setNewKeyName,
    creatingKey,
    newKeyValue,
    keyCopied,
    revokingKeyId,
    handleCreateKey,
    handleRevokeKey,
    dismissNewKey,
    copyKey,
  } = useApiKeysManager(apiKeysList, setApiKeysList);

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        API Keys
      </h2>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
        For MCP server and external integrations.
      </p>

      {/* Create new key */}
      {newKeyValue ? (
        <div className="rounded-xl p-4 mb-4 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            API key created
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Copy this key now. It will only be shown once.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] break-all select-all">
              {newKeyValue}
            </code>
            <button
              onClick={copyKey}
              className="btn-secondary flex-shrink-0"
            >
              {keyCopied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={dismissNewKey}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Claude Desktop)"
            className="input-base flex-1"
          />
          <button
            onClick={handleCreateKey}
            disabled={creatingKey || !newKeyName.trim()}
            className="btn-primary"
          >
            {creatingKey ? "Creating..." : "Create"}
          </button>
        </div>
      )}

      {/* Existing keys */}
      {apiKeysList.length > 0 ? (
        <div className="space-y-2">
          {apiKeysList.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {k.name}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  <code className="font-mono">{k.keyPrefix}...</code>
                  {" \u00b7 "}
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt && (
                    <>
                      {" \u00b7 "}
                      Last used {new Date(k.lastUsedAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!confirm(`Revoke API key "${k.name}"?`)) return;
                  handleRevokeKey(k.id);
                }}
                disabled={revokingKeyId === k.id}
                className="text-xs font-medium text-[var(--color-error)] hover:text-[var(--color-error)]/80 flex-shrink-0"
              >
                {revokingKeyId === k.id ? "Revoking..." : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No API keys yet.
        </p>
      )}
    </section>
  );
}

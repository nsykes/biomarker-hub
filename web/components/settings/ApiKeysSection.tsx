"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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

  const [serverUrl, setServerUrl] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);

  // Read window.location on the client after hydration — SSR has no
  // window, and we want the URL to match whatever origin the user
  // actually loaded the page at (supports custom domains + localhost).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerUrl(`${window.location.origin}/api/mcp/mcp`);
  }, []);

  const copyServerUrl = () => {
    navigator.clipboard.writeText(serverUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <section className="card p-4 md:p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        MCP
      </h2>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
        Connect an MCP client to query your biomarker data from chat.
      </p>

      {/* Server URL */}
      <div className="mb-4">
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          Server URL
        </p>
        <div className="flex gap-2">
          <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] break-all select-all">
            {serverUrl || "\u00a0"}
          </code>
          <button
            onClick={copyServerUrl}
            disabled={!serverUrl}
            className="btn-secondary flex-shrink-0"
          >
            {urlCopied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Claude.ai — no key needed */}
      <div className="mb-4 rounded-xl p-3.5 bg-[var(--color-primary-light)]/40 border border-[var(--color-primary)]/10 space-y-1.5">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Claude.ai &mdash; no key required
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          In Claude.ai go to <span className="font-medium">Settings &rarr; Connectors &rarr; Add custom connector</span>,
          paste the server URL above, and sign in when prompted.
          Claude.ai uses OAuth, so it handles auth on its own.
        </p>
      </div>

      {/* Everything else — needs a key */}
      <div className="mb-4 rounded-xl p-3.5 bg-[var(--color-surface-tertiary)] border border-[var(--color-border-light)] space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Claude Desktop, scripts, and other clients &mdash; create a key below
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Clients that don&apos;t speak OAuth need a Bearer key. Paste the key
          and server URL into your client&apos;s MCP config. Example for Claude
          Desktop (<code className="font-mono text-[11px]">claude_desktop_config.json</code>):
        </p>
        <pre className="text-[11px] leading-relaxed font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 overflow-auto whitespace-pre">
{`{
  "mcpServers": {
    "biomarker-hub": {
      "url": "${serverUrl || "https://.../api/mcp/mcp"}",
      "headers": {
        "Authorization": "Bearer bh_..."
      }
    }
  }
}`}
        </pre>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Create one key per client so you can revoke individually if a
          device is lost.
        </p>
      </div>

      {/* Create new key */}
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          Keys
        </p>
        {newKeyValue ? (
          <div className="rounded-xl p-4 mb-3 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 space-y-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Key created
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Copy this now. It will only be shown once.
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
          <div className="flex gap-2">
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
      </div>

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
          No keys yet.
        </p>
      )}
    </section>
  );
}

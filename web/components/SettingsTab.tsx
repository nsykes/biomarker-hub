"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppSettings, ApiKeyInfo } from "@/lib/types";
import {
  getSettingsSafe,
  updateSettingsSafe,
  deleteAccount,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/db/actions";
import { authClient } from "@/lib/auth/client";
import { AVAILABLE_MODELS } from "@/lib/models";
import { DEFAULT_MODEL } from "@/lib/constants";
import { PageSpinner } from "./Spinner";
import { DeleteAccountModal } from "./DeleteAccountModal";

export function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyStored, setKeyStored] = useState(false);
  const [keyDirty, setKeyDirty] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // API Keys state
  const [apiKeysList, setApiKeysList] = useState<ApiKeyInfo[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [result, keys] = await Promise.all([
        getSettingsSafe(),
        listApiKeys(),
      ]);
      if (result.error) {
        setLoadError(result.error);
      } else {
        const s = result.data!;
        setSettings(s);
        setApiKeyInput(s.openRouterApiKey || "");
        setKeyStored(!!s.openRouterApiKey);
      }
      setApiKeysList(keys);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveApiKey = useCallback(async () => {
    setSaving("apiKey");
    setSaveError(null);
    try {
      const result = await updateSettingsSafe({ openRouterApiKey: apiKeyInput || null });
      if (result.error) {
        setSaveError(result.error);
      } else {
        const s = result.data!;
        setSettings(s);
        setApiKeyInput(s.openRouterApiKey || "");
        setKeyStored(!!s.openRouterApiKey);
        setKeyDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }, [apiKeyInput]);

  const handleModelChange = useCallback(
    (model: string) => {
      setSettings((prev) => (prev ? { ...prev, defaultModel: model } : prev));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving("model");
        try {
          const result = await updateSettingsSafe({ defaultModel: model });
          if (result.error) console.error("Failed to save model:", result.error);
        } catch (err) {
          console.error("Failed to save model:", err);
        } finally {
          setSaving(null);
        }
      }, 300);
    },
    []
  );

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {loadError && (
        <div className="card px-4 py-3 text-sm text-[var(--color-error-text)] bg-[var(--color-error-bg)] border-[var(--color-error-bg)] flex items-center justify-between">
          <span>{loadError}</span>
          <button
            onClick={loadSettings}
            className="ml-4 px-3 py-1 text-xs font-medium bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface)] rounded-lg transition-colors flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* API Key */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          API Key
        </h2>
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setKeyDirty(true);
                  setSaved(false);
                  setSaveError(null);
                }}
                placeholder="sk-or-v1-..."
                className="input-base !pr-16"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] font-medium"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <button
              onClick={saveApiKey}
              disabled={saving === "apiKey"}
              className={saved ? "btn-primary !bg-[var(--color-success)]" : "btn-primary"}
            >
              {saving === "apiKey"
                ? "Saving..."
                : saved
                  ? "Saved!"
                  : "Save"}
            </button>
          </div>
          {saveError && (
            <div className="rounded-lg px-3 py-2 text-sm text-[var(--color-error-text)] bg-[var(--color-error-bg)]">
              {saveError}
            </div>
          )}
          {keyStored && !keyDirty && !saveError && (
            <p className="text-xs text-[var(--color-success)] font-medium">Key saved</p>
          )}
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Your OpenRouter API key. Stored as plaintext in your Neon database
            (encrypted at rest by Neon).
          </p>
        </div>
      </section>

      {/* Default Model */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          Default Model
        </h2>
        <div className="space-y-2">
          <select
            value={settings?.defaultModel || DEFAULT_MODEL}
            onChange={(e) => handleModelChange(e.target.value)}
            className="input-base !w-auto"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {saving === "model" && (
            <p className="text-xs text-[var(--color-text-tertiary)]">Saving...</p>
          )}
          <p className="text-xs text-[var(--color-text-tertiary)]">
            The model used for new extractions.
          </p>
        </div>
      </section>

      {/* Privacy FAQ */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          Privacy
        </h2>
        <div className="rounded-xl p-4 space-y-3 text-sm text-[var(--color-text-secondary)]" style={{ background: 'var(--color-privacy-gradient)' }}>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Sub-processor</p>
            <p>OpenRouter routes LLM requests to model providers.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Zero Data Retention</p>
            <p>
              ZDR is enabled on OpenRouter. All model serving vendors through
              OpenRouter have ZDR enabled.
            </p>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Data Handling</p>
            <p>
              No lab report data is retained by any third party. PDF content is
              sent to the model for extraction and immediately discarded.
            </p>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Storage</p>
            <p>
              Extraction results and uploaded PDFs are stored in your Neon
              PostgreSQL database (encrypted at rest). You can re-open any
              saved report with the original PDF in the split-pane viewer.
            </p>
          </div>
        </div>
      </section>

      {/* Export Data */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          Export Data
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          Download all your biomarker data as a CSV file. Includes dates, values, units, flags, reference ranges, and source information for every result across all reports.
        </p>
        <button
          onClick={async () => {
            setExporting(true);
            try {
              const res = await fetch("/api/account/export");
              if (!res.ok) throw new Error("Export failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "biomarker-export.csv";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (err) {
              console.error("Export failed:", err);
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
          className="btn-secondary"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </section>

      {/* API Keys */}
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
                onClick={() => {
                  navigator.clipboard.writeText(newKeyValue);
                  setKeyCopied(true);
                  setTimeout(() => setKeyCopied(false), 2000);
                }}
                className="btn-secondary flex-shrink-0"
              >
                {keyCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => {
                setNewKeyValue(null);
                setNewKeyName("");
              }}
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
              onClick={async () => {
                if (!newKeyName.trim()) return;
                setCreatingKey(true);
                try {
                  const { key, info } = await createApiKey(newKeyName.trim());
                  setNewKeyValue(key);
                  setApiKeysList((prev) => [info, ...prev]);
                } catch (err) {
                  console.error("Failed to create API key:", err);
                } finally {
                  setCreatingKey(false);
                }
              }}
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
                  onClick={async () => {
                    if (!confirm(`Revoke API key "${k.name}"?`)) return;
                    setRevokingKeyId(k.id);
                    try {
                      await revokeApiKey(k.id);
                      setApiKeysList((prev) =>
                        prev.filter((key) => key.id !== k.id)
                      );
                    } catch (err) {
                      console.error("Failed to revoke:", err);
                    } finally {
                      setRevokingKeyId(null);
                    }
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

      {/* Delete Account */}
      <section className="card p-5 border-[var(--color-error)]/20">
        <h2 className="text-base font-semibold text-[var(--color-error)] mb-3">
          Delete Account
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          Permanently delete your account and all associated data, including reports, biomarker results, PDFs, and settings. This cannot be undone.
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
            if (!result.success) throw new Error(result.error ?? "Delete failed");
            await authClient.signOut();
            window.location.href = "/auth/sign-in";
          }}
        />
      )}
    </div>
  );
}

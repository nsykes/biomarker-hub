"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppSettings } from "@/lib/types";
import { getSettingsSafe, updateSettingsSafe, deleteAccount } from "@/lib/db/actions";
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

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getSettingsSafe();
      if (result.error) {
        setLoadError(result.error);
      } else {
        const s = result.data!;
        setSettings(s);
        setApiKeyInput(s.openRouterApiKey || "");
        setKeyStored(!!s.openRouterApiKey);
      }
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

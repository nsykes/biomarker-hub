"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppSettings } from "@/lib/types";
import { getSettingsSafe, updateSettingsSafe } from "@/lib/db/actions";
import { AVAILABLE_MODELS } from "@/lib/models";
import { DEFAULT_MODEL } from "@/lib/constants";
import { PageSpinner } from "./Spinner";

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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await getSettingsSafe();
    if (result.error) {
      setLoadError(result.error);
    } else {
      const s = result.data!;
      setSettings(s);
      setApiKeyInput(s.openRouterApiKey || "");
      setKeyStored(!!s.openRouterApiKey);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveApiKey = useCallback(async () => {
    setSaving("apiKey");
    setSaveError(null);
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
    setSaving(null);
  }, [apiKeyInput]);

  const handleModelChange = useCallback(
    (model: string) => {
      setSettings((prev) => (prev ? { ...prev, defaultModel: model } : prev));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving("model");
        const result = await updateSettingsSafe({ defaultModel: model });
        if (result.error) console.error("Failed to save model:", result.error);
        setSaving(null);
      }, 300);
    },
    []
  );

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button
            onClick={loadSettings}
            className="ml-4 px-3 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 rounded transition-colors flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* API Key */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
          API Key
        </h2>
        <div className="space-y-2">
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
                className="w-full px-3 py-2 border rounded-lg text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <button
              onClick={saveApiKey}
              disabled={saving === "apiKey"}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? "bg-green-600 text-white"
                  : "bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              }`}
            >
              {saving === "apiKey"
                ? "Saving..."
                : saved
                  ? "Saved!"
                  : "Save"}
            </button>
          </div>
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {keyStored && !keyDirty && !saveError && (
            <p className="text-xs text-green-600">Key saved</p>
          )}
          <p className="text-xs text-gray-400">
            Your OpenRouter API key. Stored as plaintext in your Neon database
            (encrypted at rest by Neon).
          </p>
        </div>
      </section>

      {/* Default Model */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
          Default Model
        </h2>
        <div className="space-y-2">
          <select
            value={settings?.defaultModel || DEFAULT_MODEL}
            onChange={(e) => handleModelChange(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm bg-white"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {saving === "model" && (
            <p className="text-xs text-gray-400">Saving...</p>
          )}
          <p className="text-xs text-gray-400">
            The model used for new extractions.
          </p>
        </div>
      </section>

      {/* Privacy FAQ */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
          Privacy
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900">Sub-processor</p>
            <p>OpenRouter routes LLM requests to model providers.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Zero Data Retention</p>
            <p>
              ZDR is enabled on OpenRouter. All model serving vendors through
              OpenRouter have ZDR enabled.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Data Handling</p>
            <p>
              No lab report data is retained by any third party. PDF content is
              sent to the model for extraction and immediately discarded.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Storage</p>
            <p>
              Extraction results and uploaded PDFs are stored in your Neon
              PostgreSQL database (encrypted at rest). You can re-open any
              saved report with the original PDF in the split-pane viewer.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
